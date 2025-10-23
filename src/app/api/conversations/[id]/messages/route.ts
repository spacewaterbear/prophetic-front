import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/conversations/[id]/messages - Add a message and stream AI response
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const { id } = await params;
    const conversationId = parseInt(id);
    const body = await request.json();
    const { content } = body;

    if (!content) {
      return new Response(JSON.stringify({ error: "Content is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const supabase = createAdminClient();

    // Verify conversation belongs to user (using admin client, manually filtering)
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .eq("user_id", session.user.id)
      .single();

    if (conversationError || !conversation) {
      return new Response(JSON.stringify({ error: "Conversation not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Get the model from the conversation, default to Claude 3.7 Sonnet
    const requestedModel = (conversation as { model?: string }).model;
    const modelToUse = requestedModel || "anthropic/claude-3.7-sonnet";

    console.log(`[API] Requested model: ${requestedModel}, Using model: ${modelToUse} for conversation ${conversationId}`);

    // Insert user message
    const { data: userMessage, error: userMessageError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        content,
        sender: "user",
      })
      .select()
      .single();

    if (userMessageError) {
      console.error("Error creating user message:", userMessageError);
      return new Response(JSON.stringify({ error: "Failed to create message" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Auto-generate title from first message if needed
    if (!conversation.title || conversation.title === "New Chat") {
      const title = content.slice(0, 50) + (content.length > 50 ? "..." : "");
      await supabase
        .from("conversations")
        .update({ title })
        .eq("id", conversationId);
    }

    // Fetch conversation history for context
    const { data: messages } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    // Build conversation context (last 10 messages)
    const conversationHistory = (messages || [])
      .slice(-10)
      .map(msg => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.content
      }));

    // Create a streaming response with Prophetic API
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Validate API credentials exist
          if (!process.env.PROPHETIC_API_URL) {
            console.error("[Prophetic API Error] PROPHETIC_API_URL environment variable is not set");
            throw new Error("Prophetic API URL is not configured");
          }
          if (!process.env.PROPHETIC_API_TOKEN) {
            console.error("[Prophetic API Error] PROPHETIC_API_TOKEN environment variable is not set");
            throw new Error("Prophetic API token is not configured");
          }

          // Call Prophetic API with the selected model
          const response = await fetch(`${process.env.PROPHETIC_API_URL}/prophetic/langchain_agent/query`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${process.env.PROPHETIC_API_TOKEN}`,
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            body: JSON.stringify({
              question: content,
              model: modelToUse
            })
          });

          if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[Prophetic API Error] Status: ${response.status}, Model: ${modelToUse}, Body: ${errorBody}`);
            throw new Error(`Prophetic API error: ${response.status} - ${errorBody}`);
          }

          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error("No response body");
          }

          const decoder = new TextDecoder();
          let fullResponse = "";
          let buffer = ""; // Buffer for incomplete SSE events

          // Read and stream the response
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Append new chunk to buffer
            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            // Split by double newline to get complete SSE events
            const events = buffer.split("\n\n");

            // Keep the last incomplete event in the buffer
            buffer = events.pop() || "";

            // Process each complete event
            for (const event of events) {
              if (!event.trim()) continue;

              // Extract content from "data: " lines
              const lines = event.split("\n");
              let eventData = "";

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  eventData += line.slice(6);
                }
              }

              // Skip empty data
              if (!eventData || eventData === "[DONE]") {
                continue;
              }

              try {
                // Parse JSON-encoded chunk from Prophetic API
                const parsed = JSON.parse(eventData);

                // Handle content chunks
                if (parsed.content) {
                  const content = parsed.content;
                  fullResponse += content;

                  // Send chunk to client
                  const chunkData = JSON.stringify({
                    type: "chunk",
                    content: content
                  }) + "\n";
                  controller.enqueue(encoder.encode(chunkData));
                }

                // Handle error messages
                if (parsed.error) {
                  console.error("[Prophetic API] Error in stream:", parsed.error);
                  const errorChunk = JSON.stringify({
                    type: "error",
                    error: parsed.error
                  }) + "\n";
                  controller.enqueue(encoder.encode(errorChunk));
                }
              } catch (e) {
                // If JSON parsing fails, log and skip this chunk
                console.error("[Prophetic API] Failed to parse JSON:", eventData, e);
              }
            }
          }

          // Save AI message to database
          const { data: aiMessage, error: aiMessageError } = await supabase
            .from("messages")
            .insert({
              conversation_id: conversationId,
              content: fullResponse.trim(),
              sender: "ai",
            })
            .select()
            .single();

          if (aiMessageError) {
            console.error("Error creating AI message:", aiMessageError);
          }

          // Send completion message
          const doneChunk = JSON.stringify({
            type: "done",
            userMessage,
            aiMessage
          }) + "\n";
          controller.enqueue(encoder.encode(doneChunk));

          controller.close();
        } catch (error) {
          console.error("Error in stream:", error);
          const errorChunk = JSON.stringify({
            type: "error",
            error: "Failed to generate AI response"
          }) + "\n";
          controller.enqueue(encoder.encode(errorChunk));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in POST /api/conversations/[id]/messages:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
