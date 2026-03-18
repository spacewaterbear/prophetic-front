import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICE_STATUS_MAP: Record<string, string> = {
  [process.env.STRIPE_DISCOVER_PRICE_ID!]: "discover",
  [process.env.STRIPE_INTELLIGENCE_PRICE_ID!]: "intelligence",
  [process.env.STRIPE_ORACLE_PRICE_ID!]: "oracle",
};

const STATUS_COLUMN =
  process.env.NEXT_PUBLIC_SPECIALITY === "art" ? "art_status" : "status";

async function updateUserStatus(userId: string, status: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ [STATUS_COLUMN]: status as any })
    .eq("id", userId);
  if (error) {
    console.error("[Stripe Webhook] Supabase update failed:", error);
  }
}

async function getUserIdFromSubscription(
  subscription: Stripe.Subscription,
): Promise<string | null> {
  if (subscription.metadata?.userId) return subscription.metadata.userId;
  const customer = await stripe.customers.retrieve(
    subscription.customer as string,
  );
  if (!customer.deleted && customer.metadata?.userId) {
    return customer.metadata.userId;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const userId =
          session.client_reference_id || session.metadata?.userId;
        if (!userId || !session.subscription) break;

        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string,
        );
        const priceId = subscription.items.data[0]?.price.id;
        const newStatus = PRICE_STATUS_MAP[priceId];
        if (!newStatus) break;

        if (session.customer) {
          await stripe.customers.update(session.customer as string, {
            metadata: { userId },
          });
        }

        await updateUserStatus(userId, newStatus);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        if (
          subscription.status !== "active" &&
          subscription.status !== "trialing"
        )
          break;

        const userId = await getUserIdFromSubscription(subscription);
        if (!userId) break;

        const priceId = subscription.items.data[0]?.price.id;
        const newStatus = PRICE_STATUS_MAP[priceId];
        if (!newStatus) break;

        await updateUserStatus(userId, newStatus);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = await getUserIdFromSubscription(subscription);
        if (!userId) break;

        await updateUserStatus(userId, "unauthorized");
        break;
      }
    }
  } catch (err) {
    console.error("[Stripe Webhook] Processing error:", err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
