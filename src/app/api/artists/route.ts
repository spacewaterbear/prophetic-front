import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const DEFAULT_PAGE_SIZE = 48;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const letter = searchParams.get("letter") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_SIZE), 10)));

    const supabase = createAdminClient();
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from("artists_stats")
      .select("*", { count: "exact" });

    if (search) {
      query = query.ilike("artist_name", `%${search}%`).order("artist_name", { ascending: true });
    } else if (letter) {
      query = query
        .ilike("artist_name", `${letter}%`)
        .order("artist_name", { ascending: true });
    } else {
      query = query.order("artist_name", { ascending: true });
    }

    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error("[Artists API] Supabase error:", error);
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }

    // Log columns on first result so we can pin down the real schema
    if (data?.length && page === 1) {
      console.log("[Artists API] Available columns:", Object.keys(data[0]));
    }

    return NextResponse.json({
      artists: data || [],
      total: count || 0,
      page,
      hasMore: from + limit < (count || 0),
    });
  } catch (error) {
    console.error("[Artists API] Error:", error);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
