import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// Dev mode user ID for testing (must be valid UUID format)
const DEV_USER_ID = "00000000-0000-0000-0000-000000000000";

// Helper function to check if error is an API/maintenance error
function isMaintenanceError(errorText: unknown): boolean {
  // Convert to string if it's not already
  const errorString = typeof errorText === 'string'
    ? errorText
    : JSON.stringify(errorText);

  const maintenanceKeywords = [
    'error generating insight',
    'error code: 400',
    'error code: 429',
    'error code: 500',
    'credit balance',
    'credit_balance',
    'too low',
    'Plans & Billing',
    'invalid_request_error',
    'api error',
    'api_error',
    'rate limit',
    'rate_limit',
    'anthropic api'
  ];

  const lowerErrorText = errorString.toLowerCase();
  return maintenanceKeywords.some(keyword => lowerErrorText.includes(keyword));
}

// Helper function to extract clean error message from nested error structures
function extractErrorMessage(errorText: unknown): string {
  // Convert to string if needed
  const errorString = typeof errorText === 'string'
    ? errorText
    : JSON.stringify(errorText);

  // Check if this is a maintenance/API error first
  if (isMaintenanceError(errorString)) {
    return "My brain is in maintenance right now, please wait";
  }

  try {
    // Try to find JSON in the error text
    const jsonMatch = errorString.match(/\{.*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      // Check for detail.message pattern (common in FastAPI)
      if (parsed.detail?.message) {
        // Check if the detail message is also a maintenance error
        if (isMaintenanceError(parsed.detail.message)) {
          return "My brain is in maintenance right now, please wait";
        }
        return parsed.detail.message;
      }
      // Check for detail as string
      if (typeof parsed.detail === 'string') {
        if (isMaintenanceError(parsed.detail)) {
          return "My brain is in maintenance right now, please wait";
        }
        return parsed.detail;
      }
      // Check for message field
      if (parsed.message) {
        if (isMaintenanceError(parsed.message)) {
          return "My brain is in maintenance right now, please wait";
        }
        return parsed.message;
      }
    }
  } catch {
    // If JSON parsing fails, continue to return original
  }
  return errorString;
}

// POST /api/conversations/[id]/messages - Add a message and stream AI response
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const isDevMode = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";
    const userId = session?.user?.id || (isDevMode ? DEV_USER_ID : null);

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const { id } = await params;
    const conversationId = parseInt(id);
    const body = await request.json();
    const { content, agent_type, attachments, flash_cards, flash_card_question, flash_card_type } = body;

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
      .eq("user_id", userId)
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

    // Use agent_type for tiers_level (in uppercase)
    const tiersLevel = (agent_type || 'discover').toUpperCase(); // DISCOVER, INTELLIGENCE, or ORACLE
    console.log(`[API] Tiers level (from agent): ${tiersLevel}`);

    // Insert user message
    const { data: userMessage, error: userMessageError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        content,
        sender: "user",
        metadata: {
          ...(attachments && attachments.length > 0 ? { attachments } : {}),
          ...(flash_cards ? { is_flashcard: true, flash_cards, flash_card_type } : {})
        },
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

    // Fetch last 5 messages (user + AI) for conversation history (excluding the current message)
    const { data: previousMessages } = await supabase
      .from("messages")
      .select("content, sender, created_at")
      .eq("conversation_id", conversationId)
      .neq("id", userMessage.id)
      .order("created_at", { ascending: false })
      .limit(5);

    // Transform to structured format with role, in chronological order
    const conversationHistory = (previousMessages || [])
      .reverse()
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
          const requestBody = {
            question: flash_card_question || content,
            model: modelToUse,
            session_id: conversationId.toString(),
            user_id: conversation.user_id,
            conversation_history: conversationHistory,
            tiers_level: tiersLevel, // DISCOVER, INTELLIGENCE, or ORACLE in uppercase
            attachments: attachments || [], // Include file attachments
            flash_cards: flash_cards || undefined, // Include flashcard type if provided
            flash_card_type: flash_card_type || undefined // Include flashcard type (flash_invest or ranking) if provided
          };

          console.log(`[Prophetic API] Request to langchain_agent/query:`, JSON.stringify(requestBody, null, 2));
          console.log(`[Prophetic API] API URL configured:`, !!process.env.PROPHETIC_API_URL);
          console.log(`[Prophetic API] API Token configured:`, !!process.env.PROPHETIC_API_TOKEN);
          console.log(`[Prophetic API] Full endpoint:`, `${process.env.PROPHETIC_API_URL}/prophetic/langchain_agent/query`);

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

            // Check if this is a maintenance error and provide friendly message
            if (isMaintenanceError(errorBody)) {
              throw new Error("My brain is in maintenance right now, please wait");
            }

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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let realEstateData: any = null; // Capture real_estate_data separately
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let vignetteData: any = null; // Capture vignette_data separately

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

                // Handle real_estate_data messages
                if (parsed.type && parsed.type === "real_estate_data") {
                  console.log("[Prophetic API] Received real_estate_data");
                  // Capture real estate data for database storage
                  realEstateData = parsed;

                  // Forward real_estate_data to client immediately (SSE format)
                  const realEstateChunk = `data: ${JSON.stringify({
                    type: "real_estate_data",
                    data: parsed.data
                  })}\n\n`;
                  controller.enqueue(encoder.encode(realEstateChunk));
                  continue;
                }

                // Handle vignette_data messages
                if (parsed.type && parsed.type === "vignette_data") {
                  console.log("[Prophetic API] Received vignette_data");
                  // Capture vignette data for database storage
                  vignetteData = parsed;

                  // Forward vignette_data to client immediately (SSE format)
                  const vignetteChunk = `data: ${JSON.stringify({
                    type: "vignette_data",
                    data: parsed.data
                  })}\n\n`;
                  controller.enqueue(encoder.encode(vignetteChunk));
                  continue;
                }

                // Handle status messages
                if (parsed.type && parsed.type === "status") {
                  console.log("[Prophetic API] Received status:", parsed.message);
                  // Forward status to client immediately (SSE format)
                  const statusChunk = `data: ${JSON.stringify({
                    type: "status",
                    message: parsed.message
                  })}\n\n`;
                  controller.enqueue(encoder.encode(statusChunk));
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

                  // Check if content is actually an error message
                  if (isMaintenanceError(content)) {
                    console.log("[ERROR DETECTION] Content contains error, converting to error type");
                    const errorChunk = `data: ${JSON.stringify({
                      type: "error",
                      error: "My brain is in maintenance right now, please wait"
                    })}\n\n`;
                    controller.enqueue(encoder.encode(errorChunk));
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
                  const cleanError = extractErrorMessage(parsed.error);
                  const errorChunk = `data: ${JSON.stringify({
                    type: "error",
                    error: cleanError
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
              // For artist questions, put marketplace data at the end ("after")
              // Otherwise, use provided position or default to "before"
              const defaultPosition = messageMetadata.type === "artist_info" ? "after" : "before";
              messageMetadata.marketplace_position = marketplaceData.marketplace_position || marketplaceData.data?.marketplace_position || defaultPosition;
            } else {
              messageMetadata = {
                type: "marketplace_data",
                structured_data: marketplaceData,
                marketplace_data: marketplaceData.data,
                marketplace_position: marketplaceData.marketplace_position || marketplaceData.data?.marketplace_position || "before"
              };
            }
            console.log(`[Message Storage] Storing marketplace_data with position: ${messageMetadata.marketplace_position}`);
          }

          // If we captured real estate data, store it in metadata
          if (realEstateData && realEstateData.type === "real_estate_data") {
            // If we already have structured data, add real_estate_data to it
            if (messageMetadata) {
              messageMetadata.real_estate_data = realEstateData.data;
            } else {
              messageMetadata = {
                type: "real_estate_data",
                structured_data: realEstateData,
                real_estate_data: realEstateData.data
              };
            }
            console.log(`[Message Storage] Storing real_estate_data`);
          }

          // If we captured vignette data, store it in metadata
          if (vignetteData && vignetteData.type === "vignette_data") {
            // If we already have structured data, add vignette_data to it
            if (messageMetadata) {
              messageMetadata.vignette_data = vignetteData.data;
            } else {
              messageMetadata = {
                type: "vignette_data",
                structured_data: vignetteData,
                vignette_data: vignetteData.data
              };
            }
            console.log(`[Message Storage] Storing vignette_data`);
          }

          console.log("[Message Storage] About to save message:", {
            conversation_id: conversationId,
            contentLength: messageContent.length,
            contentPreview: messageContent.substring(0, 100),
            hasMetadata: !!messageMetadata,
            metadataType: messageMetadata?.type,
            hasMarketplaceData: !!messageMetadata?.marketplace_data,
            hasVignetteData: !!messageMetadata?.vignette_data
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
            const savedMetadata = aiMessage.metadata as Record<string, unknown> | null;
            console.log("[Message Storage] Message saved successfully:", {
              id: aiMessage.id,
              contentLength: aiMessage.content?.length,
              hasMetadata: !!aiMessage.metadata,
              metadataType: savedMetadata?.type,
              hasMarketplaceData: !!(savedMetadata?.marketplace_data),
              marketplace_position: savedMetadata?.marketplace_position,
              metadataKeys: savedMetadata ? Object.keys(savedMetadata) : []
            });

            // Log the full marketplace_data if present for debugging
            if (savedMetadata?.marketplace_data) {
              const marketplaceData = savedMetadata.marketplace_data as Record<string, unknown>;
              const artworks = marketplaceData.artworks as Array<unknown> | undefined;
              console.log("[Message Storage] Marketplace data details:", {
                found: marketplaceData.found,
                marketplace: marketplaceData.marketplace,
                artworkCount: artworks?.length
              });
            }
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
          console.error("[Stream Error] Detailed error information:", {
            error,
            errorMessage: error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : undefined,
            conversationId,
            userId: conversation.user_id,
            model: modelToUse
          });

          // Determine specific error message
          let errorMessage = "Failed to generate AI response";
          if (error instanceof Error) {
            // Check for maintenance errors first (highest priority)
            if (isMaintenanceError(error.message)) {
              errorMessage = "My brain is in maintenance right now, please wait";
            } else if (error.message.includes("API URL is not configured")) {
              errorMessage = "API configuration error: Missing API URL";
            } else if (error.message.includes("API token is not configured")) {
              errorMessage = "API configuration error: Missing API token";
            } else if (error.message.includes("Prophetic API error")) {
              // Extract clean message from nested error structure
              errorMessage = extractErrorMessage(error.message);
            } else if (error.message.includes("No response body")) {
              errorMessage = "No response received from backend";
            } else {
              errorMessage = extractErrorMessage(error.message);
            }
          }

          const errorChunk = `data: ${JSON.stringify({
            type: "error",
            error: errorMessage
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
