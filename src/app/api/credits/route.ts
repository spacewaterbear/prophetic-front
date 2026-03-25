import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const TOTAL_FREE_CREDITS = 100;
const COST_MULTIPLIER = 50;

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("is_tester")
      .eq("id", session.user.id)
      .single();

    if ((profile as { is_tester?: boolean } | null)?.is_tester) {
      return NextResponse.json({ credits: TOTAL_FREE_CREDITS, isTester: true });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("get_total_cost", {
      p_user_id: session.user.id,
    });

    if (error) {
      console.error("Error calling get_total_cost:", error);
      return NextResponse.json({ credits: TOTAL_FREE_CREDITS, isTester: false });
    }

    const totalCost = (data as number) ?? 0;
    const remaining = Math.max(0, TOTAL_FREE_CREDITS - totalCost * COST_MULTIPLIER);

    return NextResponse.json({ credits: remaining, isTester: false });
  } catch (error) {
    console.error("Credits API error:", error);
    return NextResponse.json({ credits: TOTAL_FREE_CREDITS });
  }
}
