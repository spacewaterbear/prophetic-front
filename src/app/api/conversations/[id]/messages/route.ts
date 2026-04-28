import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClientIp } from "@/lib/utils/ip";
import {
  isMaintenanceError,
  extractErrorMessage,
} from "@/lib/utils/error-parsing";
import {
  createAccumulatedState,
  processEvent,
  buildMessageMetadata,
} from "@/lib/utils/stream-accumulator";

// Dev mode user ID for testing (must be valid UUID format)
const DEV_USER_ID = "00000000-0000-0000-0000-000000000000";
// Guest user ID for unauthenticated visitors (must exist in profiles table)
const GUEST_USER_ID = "00000000-0000-0000-0000-000000000002";
const GUEST_QUESTION_LIMIT = 1;

function isGuestAllowed(): boolean {
  const env = process.env.NEXT_PUBLIC_APP_ENV;
  return env !== "staging" && env !== "preprod";
}

// POST /api/conversations/[id]/messages - Add a message and stream AI response
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const isDevMode = process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_SKIP_AUTH === "true";
    const isGuest = !session?.user?.id && !isDevMode && isGuestAllowed();
    const userId = session?.user?.id || (isDevMode ? DEV_USER_ID : (isGuestAllowed() ? GUEST_USER_ID : null));

    if (!userId) {
      return new Response(JSON.stringify({ detail: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // For guest users: enforce IP-based question quota
    if (isGuest) {
      const ip = getClientIp(request);
      const supabase = createAdminClient();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: quota } = await (supabase as any)
        .from("guest_quotas")
        .select("questions_used")
        .eq("ip_address", ip)
        .maybeSingle();

      const typedQuota = quota as { questions_used?: number } | null;
      const questionsUsed = typedQuota?.questions_used ?? 0;

      if (questionsUsed >= GUEST_QUESTION_LIMIT) {
        return new Response(JSON.stringify({ detail: "Guest quota exceeded", code: "guest_quota_exceeded" }), {
          status: 402,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Increment quota before processing (prevents parallel abuse)
      if (typedQuota) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("guest_quotas")
          .update({ questions_used: questionsUsed + 1, last_used_at: new Date().toISOString() })
          .eq("ip_address", ip);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("guest_quotas")
          .insert({ ip_address: ip, questions_used: 1 });
      }
    }

    const { id } = await params;
    const conversationId = parseInt(id);
    const body = await request.json();
    const { content, agent_type, attachments, flash_cards, flash_card_question, flash_card_type, uuid_product, product_category, immo_variant } = body;

    if (!content) {
      return new Response(JSON.stringify({ detail: "Content is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const supabase = createAdminClient();

    // Server-side credit validation for free users
    if (!isDevMode && !isGuest && session?.user?.status === "free") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("is_tester")
        .eq("id", userId)
        .maybeSingle();

      if (!(profile as { is_tester?: boolean } | null)?.is_tester) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: totalCost, error: costError } = await (supabase as any).rpc("get_total_cost", {
          p_user_id: userId,
        });

        if (!costError) {
          const TOTAL_FREE_CREDITS = 100;
          const COST_MULTIPLIER = Number(process.env.CREDITS_COST_MULTIPLIER ?? 100);
          const remaining = Math.max(0, TOTAL_FREE_CREDITS - ((totalCost as number) ?? 0) * COST_MULTIPLIER);

          if (remaining <= 0) {
            return new Response(JSON.stringify({ detail: "Insufficient credits", code: "credits_exhausted" }), {
              status: 402,
              headers: { "Content-Type": "application/json" },
            });
          }
        }
      }
    }

    // Verify conversation belongs to user
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .single();

    if (conversationError || !conversation) {
      return new Response(JSON.stringify({ detail: "Conversation not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    const requestedModel = (conversation as { model?: string }).model;
    const modelToUse = requestedModel || "anthropic/claude-3.7-sonnet";

    console.log(`[API] Requested model: ${requestedModel}, Using model: ${modelToUse} for conversation ${conversationId}`);

    const tiersLevel = (agent_type || "discover").toUpperCase();
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
      return new Response(JSON.stringify({ detail: "Failed to create message" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Update conversation title / updated_at
    const updateData: { updated_at: string; title?: string } = {
      updated_at: new Date().toISOString(),
    };
    if (!conversation.title || conversation.title === "New Chat") {
      updateData.title = content.slice(0, 50) + (content.length > 50 ? "..." : "");
    }
    await supabase
      .from("conversations")
      .update(updateData)
      .eq("id", conversationId);

    // Fetch last 5 messages for conversation history
    const { data: previousMessages } = await supabase
      .from("messages")
      .select("content, sender, created_at")
      .eq("conversation_id", conversationId)
      .neq("id", userMessage.id)
      .order("created_at", { ascending: false })
      .limit(5);

    const conversationHistory = (previousMessages || [])
      .reverse()
      .map(msg => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.content
      }));

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const enqueue = (chunk: Uint8Array) => controller.enqueue(chunk);

        try {
          if (!process.env.PROPHETIC_API_URL) {
            throw new Error("Prophetic API URL is not configured");
          }
          if (!process.env.INTERNAL_API_KEY) {
            throw new Error("Prophetic API key is not configured");
          }

          const requestBody = {
            question: flash_card_question || content,
            model: modelToUse,
            session_id: conversationId.toString(),
            user_id: conversation.user_id,
            conversation_history: conversationHistory,
            tiers_level: tiersLevel,
            attachments: attachments || [],
            flash_cards: flash_cards || undefined,
            flash_card_type: flash_card_type || undefined,
            uuid_product: uuid_product || null,
            product_category:
              product_category === "MONTRES_LUXE"
                ? "MONTRES"
                : product_category === "IMMO_LUXE"
                ? "REAL_ESTATE"
                : product_category || null,
            immo_variant: immo_variant || null,
          };

          console.log(`[Prophetic API] Request to langchain_agent/query:`, JSON.stringify(requestBody, null, 2));

          const upstreamResponse = await fetch(
            `${process.env.PROPHETIC_API_URL}/prophetic/langchain_agent/query`,
            {
              method: "POST",
              headers: {
                "x-api-key": process.env.INTERNAL_API_KEY!,
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify(requestBody),
            }
          );

          if (!upstreamResponse.ok) {
            const errorBody = await upstreamResponse.text();
            console.error(
              `[Prophetic API Error] Status: ${upstreamResponse.status}, Body: ${errorBody}`
            );
            if (isMaintenanceError(errorBody)) {
              throw new Error("My brain is in maintenance right now, please wait");
            }
            throw new Error(`Prophetic API error: ${upstreamResponse.status} - ${errorBody}`);
          }

          const reader = upstreamResponse.body?.getReader();
          if (!reader) throw new Error("No response body");

          const decoder = new TextDecoder();
          const acc = createAccumulatedState();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split("\n\n");
            buffer = events.pop() || "";

            for (const event of events) {
              if (!event.trim()) continue;

              let eventData = "";
              for (const line of event.split("\n")) {
                if (line.startsWith("data: ")) eventData += line.slice(6);
              }
              if (!eventData || eventData === "[DONE]") continue;

              try {
                console.log("[DEBUG] Raw eventData:", eventData);
                const parsed = JSON.parse(eventData) as Record<string, unknown>;
                console.log("[DEBUG] Parsed type:", parsed.type);
                processEvent(parsed, acc, enqueue, encoder);
              } catch (e) {
                console.error("[Prophetic API] Failed to parse JSON:", eventData, e);
              }
            }
          }

          // Process any remaining data in the buffer
          if (buffer.trim()) {
            let eventData = "";
            for (const line of buffer.split("\n")) {
              if (line.startsWith("data: ")) eventData += line.slice(6);
            }
            if (eventData && eventData !== "[DONE]") {
              try {
                const parsed = JSON.parse(eventData) as Record<string, unknown>;
                processEvent(parsed, acc, enqueue, encoder);
              } catch (e) {
                console.log("[Prophetic API] Could not parse remaining buffer:", e);
              }
            }
          }

          // Build and persist metadata
          const messageContent = acc.fullResponse.trim();
          const messageMetadata = buildMessageMetadata(acc);

          console.log("[Message Storage] About to save message:", {
            conversation_id: conversationId,
            contentLength: messageContent.length,
            hasMetadata: !!messageMetadata,
            metadataType: messageMetadata?.type,
          });

          const { data: aiMessage, error: aiMessageError } = await supabase
            .from("messages")
            .insert({
              conversation_id: conversationId,
              content: messageContent,
              sender: "ai",
              // Cast through unknown: MessageMetadata is structurally Json-compatible
              // but the generated Supabase type doesn't know that.
              metadata: messageMetadata as unknown as import("@/lib/supabase/types").Json,
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
            });
          }

          const doneChunk = `data: ${JSON.stringify({
            type:
              messageMetadata?.type === "artist_info" ? "artist_info" : "done",
            userMessage,
            aiMessage,
          })}\n\n`;
          controller.enqueue(encoder.encode(doneChunk));
          controller.close();
        } catch (error) {
          console.error("[Stream Error]:", {
            error,
            errorMessage: error instanceof Error ? error.message : String(error),
            conversationId,
            model: modelToUse,
          });

          let errorMessage = "Failed to generate AI response";
          if (error instanceof Error) {
            if (isMaintenanceError(error.message)) {
              errorMessage = "My brain is in maintenance right now, please wait";
            } else if (error.message.includes("API URL is not configured")) {
              errorMessage = "API configuration error: Missing API URL";
            } else if (error.message.includes("API token is not configured")) {
              errorMessage = "API configuration error: Missing API token";
            } else {
              errorMessage = extractErrorMessage(error.message);
            }
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", error: errorMessage })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in POST /api/conversations/[id]/messages:", error);
    return new Response(JSON.stringify({ detail: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
