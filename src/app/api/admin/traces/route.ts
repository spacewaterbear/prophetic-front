import { auth } from "@/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  if (!session.user.isAdmin) {
    return NextResponse.json({ detail: "Forbidden" }, { status: 403 });
  }

  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ detail: "Missing userId" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("traces")
    .select("id, timestamp, name, user_id, total_cost, input, output, metadata")
    .eq("user_id", userId)
    .order("timestamp", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Error fetching traces:", error);
    return NextResponse.json({ detail: "Failed to fetch traces" }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
