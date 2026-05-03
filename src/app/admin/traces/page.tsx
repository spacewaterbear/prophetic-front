import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { TracesDashboard } from "@/components/admin/traces/TracesDashboard";

export default async function AdminTracesPage() {
  const session = await auth();

  if (!session?.user?.isAdmin) {
    redirect("/");
  }

  return <TracesDashboard />;
}
