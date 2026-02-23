import { Webhooks } from "@polar-sh/supabase";
import { createAdminClient } from "@/lib/supabase/admin";

interface SubscriptionCustomer {
  externalId: string | null;
}

interface Subscription {
  productId: string;
  customer: SubscriptionCustomer;
}

interface SubscriptionPayload {
  data: Subscription;
}

const PRODUCT_STATUS_MAP: Record<string, string> = {
  [process.env.POLAR_DISCOVER_ID!]: "discover",
  [process.env.POLAR_INTELLIGENCE_ID!]: "intelligence",
  [process.env.POLAR_ORACLE_ID!]: "oracle",
};

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
  onSubscriptionActive: async (payload: SubscriptionPayload) => {
    const externalId = payload.data.customer.externalId;
    const productId = payload.data.productId;
    if (!externalId || !productId) return;
    const newStatus = PRODUCT_STATUS_MAP[productId];
    if (!newStatus) return;
    const supabase = createAdminClient();
    await supabase
      .from("profiles")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ status: newStatus as any })
      .eq("id", externalId);
  },
  onSubscriptionRevoked: async (payload: SubscriptionPayload) => {
    const externalId = payload.data.customer.externalId;
    if (!externalId) return;
    const supabase = createAdminClient();
    await supabase
      .from("profiles")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ status: "unauthorized" as any })
      .eq("id", externalId);
  },
  onSubscriptionCanceled: async (payload: SubscriptionPayload) => {
    const externalId = payload.data.customer.externalId;
    if (!externalId) return;
    const supabase = createAdminClient();
    await supabase
      .from("profiles")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ status: "unauthorized" as any })
      .eq("id", externalId);
  },
});
