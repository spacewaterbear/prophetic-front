import { createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Use the request origin to build the redirect URL dynamically
    // This ensures the magic link redirects to the correct domain (staging, preprod, production)
    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || process.env.NEXTAUTH_URL;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/login`,
        shouldCreateUser: true,
      },
    });

    if (error) {
      console.error("[MagicLink] Error sending:", error);
      return NextResponse.json(
        { error: "Failed to send magic link. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Magic link sent to your email",
    });
  } catch (error) {
    console.error("[MagicLink] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
