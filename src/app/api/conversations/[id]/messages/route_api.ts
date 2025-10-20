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

    console.log(`[API] Processing message for conversation ${conversationId}`);

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

    // Build conversation context (all messages for better context)
    const conversationHistory = (messages || []).map(msg => ({
      role: msg.sender === "user" ? "user" : "assistant",
      content: msg.content
    }));

    // Create a streaming response with Prophetic API (Perplexity + Claude)
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Validate API configuration exists
          if (!process.env.PROPHETIC_API_URL || !process.env.PROPHETIC_API_TOKEN) {
            console.error("[Prophetic API Error] PROPHETIC_API_URL or PROPHETIC_API_TOKEN environment variable is not set");
            throw new Error("Prophetic API configuration is missing");
          }

          // Build the messages array with system prompt and conversation history
          const apiMessages = [
            {
              role: "system",
              content: "You are Prophetic Orchestra 7.5, a luxury investment advisor AI. Provide sophisticated, data-driven insights about luxury markets, investment opportunities, and wealth management strategies. Be professional, insightful, and concise."
            },
            ...conversationHistory
          ];

          // Call Prophetic API (Perplexity + Claude endpoint)
          const apiUrl = `${process.env.PROPHETIC_API_URL}/prophetic/perplexity/query-with-claude`;
          console.log(`[Prophetic API] Calling: ${apiUrl}`);

          const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${process.env.PROPHETIC_API_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messages: apiMessages,
              perplexity_temperature: 0.7,
              claude_temperature: 0.7,
              max_tokens: 4096
            })
          });

          if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[Prophetic API Error] Status: ${response.status}, Body: ${errorBody}`);
            throw new Error(`Prophetic API error: ${response.status} - ${errorBody}`);
          }

          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error("No response body");
          }

          const decoder = new TextDecoder();
          let fullResponse = "";
          let buffer = "";

          // Read and stream the Server-Sent Events response
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              console.log("[Prophetic API] Stream done, total response length:", fullResponse.length);
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            console.log("[Prophetic API] Received chunk:", chunk.substring(0, 200));
            buffer += chunk;
            const lines = buffer.split("\n");

            // Keep the last incomplete line in the buffer
            buffer = lines.pop() || "";

            let currentEvent = "";
            let currentData = "";

            for (const line of lines) {
              console.log("[Prophetic API] Processing line:", line.substring(0, 100));
              if (line.startsWith("event: ")) {
                // New event type
                currentEvent = line.slice(7).trim();
                console.log("[Prophetic API] Event type:", currentEvent);
              } else if (line.startsWith("data: ")) {
                // Accumulate event data
                currentData += line.slice(6);
              } else if (line.trim() === "" || line === "\r") {
                // Empty line marks end of event - process it now
                if (currentData) {
                  console.log("[Prophetic API] Processing event:", currentEvent, "data length:", currentData.length);
                  if (currentEvent === "perplexity_context") {
                    // Log Perplexity context (could be sent to frontend as metadata if needed)
                    console.log("[Perplexity Context]:", currentData.slice(0, 100) + "...");
                  } else if (currentEvent === "done") {
                    // Stream completion
                    console.log("[Prophetic API] Stream completed");
                  } else if (currentEvent === "error") {
                    // Error event
                    try {
                      const errorData = JSON.parse(currentData);
                      throw new Error(errorData.error || "Unknown API error");
                    } catch (e) {
                      throw new Error(currentData);
                    }
                  } else {
                    // Regular data chunk (event type is empty or default)
                    console.log("[Prophetic API] Sending data chunk to client:", currentData.substring(0, 50));
                    fullResponse += currentData;

                    // Send chunk to client in the expected format
                    const chunkData = JSON.stringify({
                      type: "chunk",
                      content: currentData
                    }) + "\n";
                    controller.enqueue(encoder.encode(chunkData));
                  }
                }
                // Reset for next event
                currentEvent = "";
                currentData = "";
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
          console.error("Error details:", error instanceof Error ? error.message : String(error));
          console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
          const errorChunk = JSON.stringify({
            type: "error",
            error: error instanceof Error ? error.message : "Failed to generate AI response"
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
