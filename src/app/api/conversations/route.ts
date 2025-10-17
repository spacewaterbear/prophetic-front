import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/conversations - List all conversations for the current user
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Using admin client, so we manually filter by user_id for security
    const { data: conversations, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", session.user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching conversations:", error);
      return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
    }

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("Error in GET /api/conversations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/conversations - Create a new conversation
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, model } = body;

    const supabase = createAdminClient();

    // Using admin client, so we ensure user_id matches the session
    const { data: conversation, error } = await supabase
      .from("conversations")
      .insert({
        user_id: session.user.id,
        title: title || "New Chat",
        model: model || "anthropic/claude-3.5-sonnet",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating conversation:", error);
      return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
    }

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/conversations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
