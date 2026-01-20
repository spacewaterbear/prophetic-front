import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// Dev mode user ID for testing (must be valid UUID format)
const DEV_USER_ID = "00000000-0000-0000-0000-000000000000";

// Ensure dev profile exists in database
async function ensureDevProfile(supabase: ReturnType<typeof createAdminClient>) {
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", DEV_USER_ID)
    .maybeSingle();

  if (!existingProfile) {
    await supabase.from("profiles").insert({
      id: DEV_USER_ID,
      mail: "dev@localhost",
      username: "Dev User",
      status: "paid",
    });
    console.log("[DEV] Created dev profile");
  }
}

// GET /api/conversations - List all conversations for the current user
export async function GET() {
  try {
    const session = await auth();
    const isDevMode = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";

    const userId = session?.user?.id || (isDevMode ? DEV_USER_ID : null);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Ensure dev profile exists if in dev mode
    if (isDevMode && userId === DEV_USER_ID) {
      await ensureDevProfile(supabase);
    }

    // Using admin client, so we manually filter by user_id for security
    // Limit to 5 most recent conversations
    const { data: conversations, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(5);

    if (error) {
      console.error("Error fetching conversations:", error);
      return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
    }

    console.log(`[API] Loaded ${conversations?.length || 0} conversations for user ${userId}`);
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
    const isDevMode = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";

    const userId = session?.user?.id || (isDevMode ? DEV_USER_ID : null);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, model } = body;

    const supabase = createAdminClient();

    // Ensure dev profile exists if in dev mode
    if (isDevMode && userId === DEV_USER_ID) {
      await ensureDevProfile(supabase);
    }

    // Using admin client, so we ensure user_id matches the session
    const { data: conversation, error } = await supabase
      .from("conversations")
      .insert({
        user_id: userId,
        title: title || "New Chat",
        model: model || "anthropic/claude-3.7-sonnet",
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
