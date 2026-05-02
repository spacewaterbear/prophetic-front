import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const DEV_USER_ID = "00000000-0000-0000-0000-000000000000";

// PATCH /api/conversations/[id]/messages/[messageId] - Update message content
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const session = await auth();
    const isDevMode = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";
    const userId = session?.user?.id || (isDevMode ? DEV_USER_ID : null);

    if (!userId) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const { id, messageId } = await params;
    const conversationId = parseInt(id);
    const msgId = parseInt(messageId);

    if (isNaN(conversationId) || isNaN(msgId)) {
      return NextResponse.json({ detail: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json();
    const { content } = body;

    if (typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ detail: "Content is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verify conversation belongs to the user
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ detail: "Conversation not found" }, { status: 404 });
    }

    // Update the message content
    const { error: updateError } = await supabase
      .from("messages")
      .update({ content: content.trim() })
      .eq("id", msgId)
      .eq("conversation_id", conversationId);

    if (updateError) {
      console.error("Failed to update message:", updateError);
      return NextResponse.json({ detail: "Failed to update message" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH message error:", error);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
