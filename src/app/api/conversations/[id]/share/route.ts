import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { nanoid } from "nanoid";

// POST /api/conversations/[id]/share - Create a share token for a conversation
export async function POST(
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

    // Verify the conversation belongs to the user
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", session.user.id)
      .single();

    if (conversationError || !conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Check if a share already exists for this conversation
    const { data: existingShare, error: existingShareError } = await supabase
      .from("conversation_shares")
      .select("share_token, expires_at")
      .eq("conversation_id", conversationId)
      .maybeSingle();

    // If a valid share exists, return it
    if (existingShare && (!existingShare.expires_at || new Date(existingShare.expires_at) > new Date())) {
      const shareUrl = `${new URL(request.url).origin}/share/${existingShare.share_token}`;
      return NextResponse.json({
        shareToken: existingShare.share_token,
        shareUrl,
        expiresAt: existingShare.expires_at
      });
    }

    // Generate a unique share token
    const shareToken = nanoid(21); // 21 characters for security

    // Create the share record
    const { data: share, error: shareError } = await supabase
      .from("conversation_shares")
      .insert({
        conversation_id: conversationId,
        share_token: shareToken,
        created_by: session.user.id,
        expires_at: null // No expiration by default
      })
      .select()
      .single();

    if (shareError || !share) {
      console.error("Error creating share:", shareError);
      return NextResponse.json({ error: "Failed to create share" }, { status: 500 });
    }

    // Generate the shareable URL
    const shareUrl = `${new URL(request.url).origin}/share/${shareToken}`;

    return NextResponse.json({
      shareToken,
      shareUrl,
      expiresAt: share.expires_at
    });
  } catch (error) {
    console.error("Error in POST /api/conversations/[id]/share:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
