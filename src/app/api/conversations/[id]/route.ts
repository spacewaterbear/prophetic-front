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
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("Error fetching messages:", messagesError);
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }

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
