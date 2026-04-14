import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { likes, dislikes, paidFeature, userId } = body;

    if (!likes && !dislikes && !paidFeature) {
      return NextResponse.json({ detail: "Empty feedback" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("feedback").insert({
      user_id: userId ?? null,
      likes: likes ?? null,
      dislikes: dislikes ?? null,
      paid_feature: paidFeature ?? null,
    });

    if (error) {
      console.error("Feedback insert error:", error);
      return NextResponse.json({ detail: "Database error" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Feedback route error:", err);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
