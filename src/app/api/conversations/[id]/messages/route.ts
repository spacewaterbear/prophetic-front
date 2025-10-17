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

    // Create a streaming response with OpenRouter
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Call OpenRouter API with Mistral Medium
          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
              "Content-Type": "application/json",
              "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
              "X-Title": "Prophetic Orchestra 7.5"
            },
            body: JSON.stringify({
              model: "mistralai/mistral-large",
              messages: [
                {
                  role: "system",
                  content: "You are Prophetic Orchestra 7.5, a luxury investment advisor AI. Provide sophisticated, data-driven insights about luxury markets, investment opportunities, and wealth management strategies. Be professional, insightful, and concise."
                },
                ...conversationHistory,
                {
                  role: "user",
                  content: content
                }
              ],
              stream: true
            })
          });

          if (!response.ok) {
            throw new Error(`OpenRouter API error: ${response.status}`);
          }

          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error("No response body");
          }

          const decoder = new TextDecoder();
          let fullResponse = "";

          // Read and stream the response
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") continue;

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content || "";

                  if (content) {
                    fullResponse += content;

                    // Send chunk to client
                    const chunkData = JSON.stringify({
                      type: "chunk",
                      content: content
                    }) + "\n";
                    controller.enqueue(encoder.encode(chunkData));
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
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
