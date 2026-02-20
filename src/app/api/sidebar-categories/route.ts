import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const speciality = process.env.SPECIALITY || "main";
    const supabase = createAdminClient();

    const filterField = speciality === "art" ? "is_art" : "is_main";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("vignettes")
      .select("category")
      .eq(filterField, true);

    if (error) {
      console.error("[Sidebar Categories] Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const categories: string[] = [
      ...new Set((data || []).map((v: any) => v.category as string)),
    ] as string[];

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("[Sidebar Categories] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
