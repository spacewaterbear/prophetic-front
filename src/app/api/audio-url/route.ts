import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "sources";
const SIGNED_URL_EXPIRY = 3600; // 1 hour
const SAFE_FILENAME_RE = /^[\w.\-]+$/;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fileName = searchParams.get("fileName");

  if (!fileName || !SAFE_FILENAME_RE.test(fileName)) {
    return NextResponse.json({ detail: "Invalid fileName" }, { status: 400 });
  }

  const appEnv = process.env.ENVIRONNEMENT ?? "dev";
  const storagePath = `${appEnv}/VIGNETTES/PODCAST/${fileName}`;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);

    if (error || !data?.signedUrl) {
      console.error("[audio-url] Failed to create signed URL:", error);
      return NextResponse.json(
        { detail: "Could not generate signed URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ signedUrl: data.signedUrl });
  } catch (err) {
    console.error("[audio-url] Unexpected error:", err);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
