import { createAdminClient } from "@/lib/supabase/admin";
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

    const profileId = await createOrUpdateMagicLinkProfile(
      userId,
      email,
      firstName,
      lastName,
      isNewUser
    );

    if (!profileId) {
      return NextResponse.json(
        { error: "Failed to create/update profile" },
        { status: 500 }
      );
    }

    // Get user status
    const adminClient = createAdminClient();
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

async function createOrUpdateMagicLinkProfile(
  userId: string,
  email: string,
  firstName?: string,
  lastName?: string,
  isNewUser?: boolean
): Promise<string | null> {
  try {
    const adminClient = createAdminClient();

    // Build the update fields with name data if provided
    const nameFields: Record<string, string | null> = {};
    if (firstName && lastName) {
      nameFields.first_name = firstName;
      nameFields.last_name = lastName;
      nameFields.username = `${firstName} ${lastName}`;
    }

    // Check if profile exists by email first (handles Google → Magic Link case)
    const { data: existingProfileByEmail } = await adminClient
      .from("profiles")
      .select("id")
      .eq("mail", email)
      .maybeSingle();

    if (existingProfileByEmail) {
      await adminClient
        .from("profiles")
        .update({
          ...nameFields,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingProfileByEmail.id);

      return existingProfileByEmail.id;
    }

    // Check if profile exists by Supabase Auth user ID
    // (the trigger on_auth_user_created creates a profile with just id + mail)
    const { data: existingProfileById } = await adminClient
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (existingProfileById) {
      await adminClient
        .from("profiles")
        .update({
          mail: email,
          ...nameFields,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      return userId;
    }

    // No existing profile - create new one
    const username = firstName && lastName
      ? `${firstName} ${lastName}`
      : email.split("@")[0] || "User";

    const { error } = await adminClient.from("profiles").insert({
      id: userId,
      mail: email,
      username,
      first_name: firstName || null,
      last_name: lastName || null,
      status: "unauthorized",
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("[MagicLink] Profile creation error:", error);
      return null;
    }

    return userId;
  } catch (error) {
    console.error("[MagicLink] Profile management error:", error);
    return null;
  }
}
