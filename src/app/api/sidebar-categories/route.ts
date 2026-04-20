import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const speciality = process.env.NEXT_PUBLIC_SPECIALITY || "main";
    const supabase = createAdminClient();

    const filterField = speciality === "art" ? "is_art" : "is_main";

    const environnement = process.env.ENVIRONNEMENT || "staging";
    const vignettesTable = `vignettes_${environnement}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from(vignettesTable)
      .select("category")
      .eq(filterField, true);

    if (error) {
      console.error("[Sidebar Categories] Supabase error:", error);
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }

    const categories: string[] = [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...new Set((data || []).map((v: any) => v.category as string)),
    ] as string[];

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("[Sidebar Categories] Error:", error);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
