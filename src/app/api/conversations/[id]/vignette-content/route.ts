import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// Dev mode user ID for testing (must be valid UUID format)
const DEV_USER_ID = "00000000-0000-0000-0000-000000000000";

// POST /api/conversations/[id]/vignette-content - Save vignette AI messages without triggering response
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const isDevMode = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";
    const userId = session?.user?.id || (isDevMode ? DEV_USER_ID : null);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const conversationId = parseInt(id);
    const supabase = createAdminClient();

    // Verify conversation exists and belongs to user
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .single();

    if (conversationError || !conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const body = await request.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages array is required" }, { status: 400 });
    }

    // Insert all messages
    const messagesToInsert = messages.map((msg: { content: string; vignetteCategory?: string }) => ({
      conversation_id: conversationId,
      content: msg.content,
      sender: "ai" as const,
      metadata: msg.vignetteCategory ? { vignette_category: msg.vignetteCategory } : null,
    }));

    const { data: insertedMessages, error: insertError } = await supabase
      .from("messages")
      .insert(messagesToInsert)
      .select();

    if (insertError) {
      console.error("Error inserting vignette messages:", insertError);
      return NextResponse.json({ error: "Failed to save messages" }, { status: 500 });
    }

    console.log(`[Vignette Content] Saved ${insertedMessages?.length} messages to conversation ${conversationId}`);

    return NextResponse.json({
      success: true,
      messages: insertedMessages
    });

  } catch (error) {
    console.error("Error in POST /api/conversations/[id]/vignette-content:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
