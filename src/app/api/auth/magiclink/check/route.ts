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
      .select("id, status, first_name, last_name")
      .eq("mail", email)
      .maybeSingle();

    if (existingProfileByEmail) {
      // Profile exists but if first_name/last_name are missing, registration is incomplete
      const registrationComplete = !!(existingProfileByEmail.first_name && existingProfileByEmail.last_name);
      return NextResponse.json({
        exists: true,
        profileId: existingProfileByEmail.id,
        status: existingProfileByEmail.status,
        registrationComplete,
      });
    }

    // Check if profile exists by user ID
    const { data: existingProfileById } = await adminClient
      .from("profiles")
      .select("id, status, first_name, last_name")
      .eq("id", userId)
      .maybeSingle();

    if (existingProfileById) {
      const registrationComplete = !!(existingProfileById.first_name && existingProfileById.last_name);
      return NextResponse.json({
        exists: true,
        profileId: existingProfileById.id,
        status: existingProfileById.status,
        registrationComplete,
      });
    }

    // User does not exist
    return NextResponse.json({
      exists: false,
      registrationComplete: false,
    });
  } catch (error) {
    console.error("[MagicLink Check] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
