import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/conversations/[id] - Get a conversation with its messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const conversationId = parseInt(id);
    const supabase = createAdminClient();

    // Fetch conversation (using admin client, manually filtering by user_id)
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .eq("user_id", session.user.id)
      .single();

    if (conversationError || !conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Fetch messages
    const { data: rawMessages, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("Error fetching messages:", messagesError);
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }

    console.log("[GET Conversation] Raw messages from DB:", rawMessages?.length);
    rawMessages?.forEach((msg, idx) => {
      const metadata = msg.metadata as Record<string, unknown> | null | undefined;
      console.log(`[GET Conversation] Raw message ${idx}:`, {
        id: msg.id,
        sender: msg.sender,
        hasContent: !!msg.content,
        contentLength: (msg.content as string | undefined)?.length,
        hasMetadata: !!msg.metadata,
        metadataType: metadata?.type
      });
    });

    // Transform messages to include structured data from metadata
    const messages = (rawMessages || []).map((msg: Record<string, unknown>) => {
      // If message has metadata with structured_data, expand it into the message object
      if (msg.metadata && typeof msg.metadata === 'object' && msg.metadata !== null) {
        const metadata = msg.metadata as Record<string, unknown>;
        if (metadata.structured_data && typeof metadata.structured_data === 'object') {
          const structuredData = metadata.structured_data as Record<string, unknown>;

          // Preserve the original content field (the actual text response)
          // and merge structured data fields into the message object
          const originalContent = msg.content;
          return {
            ...msg,
            type: metadata.type,
            ...structuredData,
            content: originalContent, // Ensure original content is not overwritten
          };
        }
      }

      // Return message as-is if no structured data
      return msg;
    }).map((msg: Record<string, unknown>) => {
      // Transform artist_info messages to regular messages to prevent ArtistCard from displaying
      // but preserve the text content
      if (msg.type === 'artist_info') {
        // Remove artist-specific fields but KEEP the content field
        const { type, artist, message, research_type, has_existing_data, text, streaming_text, ...rest } = msg;

        // Return the message without artist_info type, but with content preserved
        return rest;
      }
      return msg;
    }).map((msg: Record<string, unknown>) => {
      // If a message has marketplace_data in metadata, include it in the message object
      if (msg.metadata && typeof msg.metadata === 'object' && msg.metadata !== null) {
        const metadata = msg.metadata as Record<string, unknown>;
        if (metadata.marketplace_data) {
          try {
            console.log("[GET Conversation] Processing marketplace_data for message:", msg.id);
            console.log("[GET Conversation] marketplace_data type:", typeof metadata.marketplace_data);
            console.log("[GET Conversation] marketplace_data keys:", Object.keys(metadata.marketplace_data as object));

            // Include marketplace_data and marketplace_position directly in the message
            return {
              ...msg,
              marketplace_data: metadata.marketplace_data,
              marketplace_position: metadata.marketplace_position || "before" // Default to 'before' if not specified
            };
          } catch (error) {
            console.error("[GET Conversation] Error processing marketplace_data for message:", msg.id, error);
            // Return message without marketplace_data if there's an error
            return msg;
          }
        }

        // If a message has real_estate_data in metadata, include it in the message object
        if (metadata.real_estate_data) {
          try {
            console.log("[GET Conversation] Processing real_estate_data for message:", msg.id);

            // Include real_estate_data directly in the message
            return {
              ...msg,
              real_estate_data: metadata.real_estate_data
            };
          } catch (error) {
            console.error("[GET Conversation] Error processing real_estate_data for message:", msg.id, error);
            // Return message without real_estate_data if there's an error
            return msg;
          }
        }

        // If a message has clothes_search_data in metadata, include it in the message object
        if (metadata.clothes_search_data) {
          try {
            console.log("[GET Conversation] Processing clothes_search_data for message:", msg.id);

            // Include clothes_search_data directly in the message
            return {
              ...msg,
              clothes_search_data: metadata.clothes_search_data
            };
          } catch (error) {
            console.error("[GET Conversation] Error processing clothes_search_data for message:", msg.id, error);
            // Return message without clothes_search_data if there's an error
            return msg;
          }
        }
      }
      return msg;
    });

    console.log("[GET Conversation] Returning", messages.length, "messages");
    messages.forEach((msg, idx) => {
      const metadata = msg.metadata as Record<string, unknown> | null | undefined;
      console.log(`[GET Conversation] Message ${idx}:`, {
        id: msg.id,
        type: msg.type,
        sender: msg.sender,
        hasContent: !!msg.content,
        contentLength: (msg.content as string | undefined)?.length,
        hasMarketplaceData: !!msg.marketplace_data,
        hasRealEstateData: !!msg.real_estate_data,
        hasClothesSearchData: !!msg.clothes_search_data,
        hasMetadata: !!msg.metadata,
        metadataHasMarketplaceData: !!(metadata?.marketplace_data),
        metadataHasRealEstateData: !!(metadata?.real_estate_data),
        metadataHasClothesSearchData: !!(metadata?.clothes_search_data),
        marketplace_position: msg.marketplace_position
      });
    });

    return NextResponse.json({ conversation, messages });
  } catch (error) {
    console.error("Error in GET /api/conversations/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/conversations/[id] - Update a conversation
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const conversationId = parseInt(id);
    const body = await request.json();
    const { title, model } = body;

    const supabase = createAdminClient();

    // Build update object with only provided fields
    const updateData: { title?: string; model?: string } = {};
    if (title !== undefined) updateData.title = title;
    if (model !== undefined) updateData.model = model;

    // Using admin client, manually filtering by user_id for security
    const { data: conversation, error } = await supabase
      .from("conversations")
      .update(updateData)
      .eq("id", conversationId)
      .eq("user_id", session.user.id)
      .select()
      .single();

    if (error || !conversation) {
      console.error("Error updating conversation:", error);
      return NextResponse.json({ error: "Failed to update conversation" }, { status: 500 });
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error("Error in PATCH /api/conversations/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/conversations/[id] - Delete a conversation and its messages
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const conversationId = parseInt(id);
    const supabase = createAdminClient();

    // First verify the conversation belongs to the user
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", session.user.id)
      .single();

    if (conversationError || !conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Delete all messages associated with the conversation
    const { error: messagesError } = await supabase
      .from("messages")
      .delete()
      .eq("conversation_id", conversationId);

    if (messagesError) {
      console.error("Error deleting messages:", messagesError);
      return NextResponse.json({ error: "Failed to delete messages" }, { status: 500 });
    }

    // Delete the conversation
    const { error: deleteError } = await supabase
      .from("conversations")
      .delete()
      .eq("id", conversationId)
      .eq("user_id", session.user.id);

    if (deleteError) {
      console.error("Error deleting conversation:", deleteError);
      return NextResponse.json({ error: "Failed to delete conversation" }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error in DELETE /api/conversations/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
