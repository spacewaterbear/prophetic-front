import { createAdminClient } from "@/lib/supabase/admin";
import { upsertProfile } from "@/lib/supabase/profiles";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { userId, email, firstName, lastName, isNewUser } = await req.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: "Missing userId or email" },
        { status: 400 }
      );
    }

    // For new users, require first and last name
    if (isNewUser && (!firstName || !lastName)) {
      return NextResponse.json(
        { error: "First name and last name are required for new users" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const username = firstName && lastName
      ? `${firstName} ${lastName}`
      : undefined;

    const profileId = await upsertProfile(adminClient, {
      id: userId,
      email,
      username,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
    });

    if (!profileId) {
      return NextResponse.json(
        { error: "Failed to create/update profile" },
        { status: 500 }
      );
    }

    // Get user status
    const { data: profile } = await adminClient
      .from("profiles")
      .select("status")
      .eq("id", profileId)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      profileId,
      status: profile?.status || "unauthorized",
    });
  } catch (error) {
    console.error("[MagicLink Callback] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

