import { auth } from "@/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  if (!session.user.isAdmin) {
    return NextResponse.json({ detail: "Forbidden" }, { status: 403 });
  }

  const { id: traceId } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("observations")
    .select("*")
    .eq("trace_id", traceId)
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Error fetching observations:", error);
    return NextResponse.json({ detail: "Failed to fetch observations" }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
