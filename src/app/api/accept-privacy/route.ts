import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("has_accepted_conf_politic_and_cgu")
    .eq("id", session.user.id)
    .single();

  return NextResponse.json({
    accepted: data?.has_accepted_conf_politic_and_cgu ?? false,
  });
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({ has_accepted_conf_politic_and_cgu: true })
    .eq("id", session.user.id);

  if (error) {
    console.error("[accept-privacy] Update error:", error);
    return NextResponse.json({ detail: "Failed to update" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
