import { auth } from "@/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  if (!session.user.isAdmin) {
    return NextResponse.json({ detail: "Forbidden" }, { status: 403 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("profile_trace_counts")
    .select("id, first_name, last_name, username, mail, status, trace_count")
    .order("trace_count", { ascending: false });

  if (error) {
    console.error("Error fetching profiles:", error);
    return NextResponse.json({ detail: "Failed to fetch users" }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
