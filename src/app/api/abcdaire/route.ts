import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const DEFAULT_PAGE_SIZE = 48;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category") || "WINE";
    const search = searchParams.get("search") || "";
    const letter = searchParams.get("letter") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_SIZE), 10)));

    const supabase = createAdminClient();
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from("abcdaire")
      .select("id, name, category, sub_category", { count: "exact" })
      .eq("category", category);

    if (search) {
      query = query.ilike("name", `%${search}%`).order("name", { ascending: true });
    } else if (letter) {
      query = query
        .ilike("name", `${letter}%`)
        .order("name", { ascending: true });
    } else {
      query = query.order("name", { ascending: true });
    }

    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error("[Abcdaire API] Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      items: data || [],
      total: count || 0,
      page,
      hasMore: from + limit < (count || 0),
    });
  } catch (error) {
    console.error("[Abcdaire API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
