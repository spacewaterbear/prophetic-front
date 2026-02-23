import { CustomerPortal } from "@polar-sh/supabase";
import { Polar } from "@polar-sh/sdk";
import { auth } from "@/auth";

export const GET = CustomerPortal({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  getCustomerId: async (_req) => {
    const session = await auth();
    if (!session?.user?.id) return "";
    const polar = new Polar({
      accessToken: process.env.POLAR_ACCESS_TOKEN!,
      server: "sandbox",
    });
    const customer = await polar.customers.getExternal({ externalId: session.user.id });
    return customer.id;
  },
  server: "sandbox",
});
