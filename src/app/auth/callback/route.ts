import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  // Only handle magic link verifications
  if (!token_hash || type !== "magiclink") {
    return NextResponse.redirect(
      new URL("/login?error=invalid_request", origin)
    );
  }

  try {
    const supabase = await createServerSupabaseClient();

    // Verify the magic link token with Supabase
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: "email",
    });

    if (error || !data.user) {
      console.error("[MagicLink Callback] Verification error:", error);
      return NextResponse.redirect(
        new URL("/login?error=invalid_or_expired_link", origin)
      );
    }

    const user = data.user;

    // Create or update user profile in our profiles table
    const profileId = await createOrUpdateMagicLinkProfile(
      user.id,
      user.email!
    );

    if (!profileId) {
      console.error("[MagicLink Callback] Failed to create/update profile");
      return NextResponse.redirect(
        new URL("/login?error=profile_error", origin)
      );
    }

    // Check user status to determine redirect
    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("profiles")
      .select("status")
      .eq("id", profileId)
      .maybeSingle();

    // Redirect to appropriate page based on user status
    // The Supabase session is now set via cookies, and NextAuth will pick it up
    if (profile?.status === "unauthorized") {
      return NextResponse.redirect(
        new URL(
          `/login?magic_link_success=true&user_id=${profileId}&email=${encodeURIComponent(user.email!)}&redirect=pending`,
          origin
        )
      );
    }

    return NextResponse.redirect(
      new URL(
        `/login?magic_link_success=true&user_id=${profileId}&email=${encodeURIComponent(user.email!)}`,
        origin
      )
    );
  } catch (error) {
    console.error("[MagicLink Callback] Unexpected error:", error);
    return NextResponse.redirect(
      new URL("/login?error=server_error", origin)
    );
  }
}

async function createOrUpdateMagicLinkProfile(
  userId: string,
  email: string
): Promise<string | null> {
  try {
    const adminClient = createAdminClient();

    // Check if profile exists by email first (handles Google → Magic Link case)
    const { data: existingProfileByEmail } = await adminClient
      .from("profiles")
      .select("id")
      .eq("mail", email)
      .maybeSingle();

    if (existingProfileByEmail) {
      // Profile exists with this email - update it
      await adminClient
        .from("profiles")
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingProfileByEmail.id);

      return existingProfileByEmail.id;
    }

    // Check if profile exists by Supabase Auth user ID
    const { data: existingProfileById } = await adminClient
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (existingProfileById) {
      // Profile exists with this ID - update it
      await adminClient
        .from("profiles")
        .update({
          mail: email,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      return userId;
    }

    // No existing profile - create new one
    const { error } = await adminClient.from("profiles").insert({
      id: userId,
      mail: email,
      username: email.split("@")[0] || "User",
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
