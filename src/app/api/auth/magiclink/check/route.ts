import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await req.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: "Missing userId or email" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Check if profile exists by email first
    const { data: existingProfileByEmail } = await adminClient
      .from("profiles")
      .select("id, status")
      .eq("mail", email)
      .maybeSingle();

    if (existingProfileByEmail) {
      return NextResponse.json({
        exists: true,
        profileId: existingProfileByEmail.id,
        status: existingProfileByEmail.status,
      });
    }

    // Check if profile exists by user ID
    const { data: existingProfileById } = await adminClient
      .from("profiles")
      .select("id, status")
      .eq("id", userId)
      .maybeSingle();

    if (existingProfileById) {
      return NextResponse.json({
        exists: true,
        profileId: existingProfileById.id,
        status: existingProfileById.status,
      });
    }

    // User does not exist
    return NextResponse.json({
      exists: false,
    });
  } catch (error) {
    console.error("[MagicLink Check] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
