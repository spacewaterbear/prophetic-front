import { auth } from "@/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

const PAGE_SIZE = 50;

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

  const before = req.nextUrl.searchParams.get("before");

  const supabase = createAdminClient();

  let query = supabase
    .from("traces")
    .select("id, timestamp, name, user_id, total_cost, input, output, metadata")
    .eq("user_id", userId)
    .order("timestamp", { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (before) {
    query = query.lt("timestamp", before);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching traces:", error);
    return NextResponse.json({ detail: "Failed to fetch traces" }, { status: 500 });
  }

  const rows = data ?? [];
  const hasMore = rows.length > PAGE_SIZE;

  return NextResponse.json({
    data: hasMore ? rows.slice(0, PAGE_SIZE) : rows,
    hasMore,
  });
}
