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

    // Fetch last 5 user messages for conversation history (excluding the current message)
    const { data: previousUserMessages } = await supabase
      .from("messages")
      .select("content")
      .eq("conversation_id", conversationId)
      .eq("sender", "user")
      .neq("id", userMessage.id)
      .order("created_at", { ascending: false })
      .limit(5);

    // Extract content strings and reverse to maintain chronological order
    const conversationHistory = (previousUserMessages || [])
      .reverse()
      .map(msg => msg.content);

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
          const requestBody = {
            question: content,
            model: modelToUse,
            session_id: conversationId.toString(),
            user_id: conversation.user_id,
            conversation_history: conversationHistory
          };

          console.log(`[Prophetic API] Request to langchain_agent/query:`, JSON.stringify(requestBody, null, 2));

          const response = await fetch(`${process.env.PROPHETIC_API_URL}/prophetic/langchain_agent/query`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${process.env.PROPHETIC_API_TOKEN}`,
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            body: JSON.stringify(requestBody)
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let structuredData: any = null; // Capture artist_info or other structured responses
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let marketplaceData: any = null; // Capture marketplace_data separately

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
                console.log("[DEBUG] Raw eventData:", eventData);
                const parsed = JSON.parse(eventData);
                console.log("[DEBUG] Parsed type:", parsed.type, "has content:", !!parsed.content, "content preview:", parsed.content?.substring(0, 100));

                // Handle structured data responses (artist_info, metadata, etc.)
                if (parsed.type && parsed.type === "artist_info") {
                  console.log("[Prophetic API] Received artist_info structured data");
                  structuredData = parsed;

                  // Send artist_info to client immediately for display (SSE format)
                  const artistChunk = `data: ${JSON.stringify({
                    type: "artist_info",
                    data: parsed
                  })}\n\n`;
                  controller.enqueue(encoder.encode(artistChunk));
                  continue;
                }

                // Handle metadata messages (intro text, etc.)
                if (parsed.type && parsed.type === "metadata") {
                  console.log("[Prophetic API] Received metadata");
                  // Forward metadata to client (SSE format)
                  const metadataChunk = `data: ${JSON.stringify(parsed)}\n\n`;
                  controller.enqueue(encoder.encode(metadataChunk));

                  // If skip_streaming is true and there's intro text, add it to fullResponse
                  if (parsed.skip_streaming && parsed.intro) {
                    fullResponse += parsed.intro + "\n\n";
                  }
                  continue;
                }

                // Handle marketplace_data messages
                if (parsed.type && parsed.type === "marketplace_data") {
                  console.log("[Prophetic API] Received marketplace_data");
                  // Capture marketplace data for database storage
                  marketplaceData = parsed;

                  // Forward marketplace_data to client immediately (SSE format)
                  const marketplaceChunk = `data: ${JSON.stringify({
                    type: "marketplace_data",
                    data: parsed.data
                  })}\n\n`;
                  controller.enqueue(encoder.encode(marketplaceChunk));
                  continue;
                }

                // Handle content chunks (regular text responses)
                if (parsed.content) {
                  const content = parsed.content;
                  const trimmedContent = content.trim();

                  // Check if content contains nested SSE data (Prophetic API sends structured data this way)
                  if (trimmedContent.startsWith('data:')) {
                    console.log("[NESTED SSE] Detected nested SSE in content field");
                    // Extract the JSON after "data: " and before any trailing whitespace/newlines
                    const nestedJsonStr = trimmedContent.slice(6).trim();

                    try {
                      const nestedData = JSON.parse(nestedJsonStr);
                      console.log("[NESTED SSE] Parsed nested data type:", nestedData.type);

                      // Handle artist_info nested in content
                      if (nestedData.type === "artist_info") {
                        console.log("[Prophetic API] Received artist_info (from nested content)");
                        structuredData = nestedData;

                        // Send artist_info to client immediately for display (SSE format)
                        const artistChunk = `data: ${JSON.stringify({
                          type: "artist_info",
                          data: nestedData
                        })}\n\n`;
                        controller.enqueue(encoder.encode(artistChunk));
                        continue;
                      }

                      // Handle metadata nested in content
                      if (nestedData.type === "metadata") {
                        console.log("[Prophetic API] Received metadata (from nested content)");
                        // Forward metadata to client (SSE format)
                        const metadataChunk = `data: ${JSON.stringify(nestedData)}\n\n`;
                        controller.enqueue(encoder.encode(metadataChunk));

                        // If skip_streaming is true and there's intro text, add it to fullResponse
                        if (nestedData.skip_streaming && nestedData.intro) {
                          fullResponse += nestedData.intro + "\n\n";
                        }
                        continue;
                      }

                      // If it's some other nested type, log and skip
                      console.log("[NESTED SSE] Unhandled nested type, skipping");
                      continue;
                    } catch (e) {
                      // Not valid JSON after "data: ", skip this chunk
                      console.log("[NESTED SSE] Failed to parse nested JSON, skipping");
                      continue;
                    }
                  }

                  // Skip standalone JSON objects (shouldn't happen but defensive)
                  if (trimmedContent.startsWith('{')) {
                    console.log("[SKIP] Ignoring standalone JSON in content field");
                    continue;
                  }

                  // Normal text content - add to response and send to client
                  fullResponse += content;

                  // Send chunk to client (SSE format)
                  const chunkData = `data: ${JSON.stringify({
                    type: "chunk",
                    content: content
                  })}\n\n`;
                  controller.enqueue(encoder.encode(chunkData));
                }

                // Handle error messages
                if (parsed.error) {
                  console.error("[Prophetic API] Error in stream:", parsed.error);
                  const errorChunk = `data: ${JSON.stringify({
                    type: "error",
                    error: parsed.error
                  })}\n\n`;
                  controller.enqueue(encoder.encode(errorChunk));
                }
              } catch (e) {
                // If JSON parsing fails, log and skip this chunk
                console.error("[Prophetic API] Failed to parse JSON:", eventData, e);
              }
            }
          }

          // Prepare message content and metadata based on response type
          const messageContent = fullResponse.trim();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let messageMetadata: any = null;

          // If we captured structured data (e.g., artist_info), store it in metadata
          if (structuredData && structuredData.type) {
            messageMetadata = {
              type: structuredData.type,
              structured_data: structuredData
            };

            // For artist_info, the intro text is what the user sees first
            // The structured data will be rendered as a card by the frontend
            console.log(`[Message Storage] Storing structured response type: ${structuredData.type}`);
          }

          // If we captured marketplace data, store it in metadata
          if (marketplaceData && marketplaceData.type === "marketplace_data") {
            // If we already have structured data (e.g., artist_info), create a combined metadata
            if (messageMetadata) {
              messageMetadata.marketplace_data = marketplaceData.data;
            } else {
              messageMetadata = {
                type: "marketplace_data",
                structured_data: marketplaceData
              };
            }
            console.log(`[Message Storage] Storing marketplace_data`);
          }

          console.log("[Message Storage] About to save message:", {
            conversation_id: conversationId,
            contentLength: messageContent.length,
            contentPreview: messageContent.substring(0, 100),
            hasMetadata: !!messageMetadata,
            metadataType: messageMetadata?.type,
            hasMarketplaceData: !!messageMetadata?.marketplace_data
          });

          // Save AI message to database
          const { data: aiMessage, error: aiMessageError } = await supabase
            .from("messages")
            .insert({
              conversation_id: conversationId,
              content: messageContent,
              sender: "ai",
              metadata: messageMetadata,
            })
            .select()
            .single();

          if (aiMessageError) {
            console.error("Error creating AI message:", aiMessageError);
          } else {
            console.log("[Message Storage] Message saved successfully:", {
              id: aiMessage.id,
              contentLength: aiMessage.content?.length,
              hasMetadata: !!aiMessage.metadata
            });
          }

          // Send completion message with type indicator if structured (SSE format)
          const doneChunk = `data: ${JSON.stringify({
            type: messageMetadata?.type === "artist_info" ? "artist_info" : "done",
            userMessage,
            aiMessage
          })}\n\n`;
          controller.enqueue(encoder.encode(doneChunk));

          controller.close();
        } catch (error) {
          console.error("Error in stream:", error);
          const errorChunk = `data: ${JSON.stringify({
            type: "error",
            error: "Failed to generate AI response"
          })}\n\n`;
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
