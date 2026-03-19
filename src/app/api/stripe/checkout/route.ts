import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_PRICE_IDS = new Set([
  process.env.STRIPE_DISCOVER_PRICE_ID,
  process.env.STRIPE_FLASH_PRICE_ID,
  process.env.STRIPE_INTELLIGENCE_PRICE_ID,
  process.env.STRIPE_ORACLE_PRICE_ID,
]);

// flash < discover < intelligence < oracle
const PLAN_ORDER: Record<string, number> = {
  [process.env.STRIPE_FLASH_PRICE_ID!]: 0,
  [process.env.STRIPE_DISCOVER_PRICE_ID!]: 1,
  [process.env.STRIPE_INTELLIGENCE_PRICE_ID!]: 2,
  [process.env.STRIPE_ORACLE_PRICE_ID!]: 3,
};

const PRICE_STATUS_MAP: Record<string, string> = {
  [process.env.STRIPE_FLASH_PRICE_ID!]: "flash",
  [process.env.STRIPE_DISCOVER_PRICE_ID!]: "discover",
  [process.env.STRIPE_INTELLIGENCE_PRICE_ID!]: "intelligence",
  [process.env.STRIPE_ORACLE_PRICE_ID!]: "oracle",
};

const STATUS_COLUMN =
  process.env.NEXT_PUBLIC_SPECIALITY === "art" ? "art_status" : "status";

async function updateProfileStatus(userId: string, status: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ [STATUS_COLUMN]: status as any })
    .eq("id", userId);
  if (error) {
    console.error("[Stripe Checkout] Supabase update failed:", error);
  }
}

export async function GET(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const priceId = searchParams.get("priceId");

  if (!priceId || !ALLOWED_PRICE_IDS.has(priceId)) {
    return NextResponse.json({ error: "Invalid priceId" }, { status: 400 });
  }

  const userId = session.user.id;
  const email = session.user.email ?? undefined;

  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    req.nextUrl.origin;

  // Find or create Stripe customer
  let customerId: string | undefined;
  if (email) {
    const existing = await stripe.customers.list({ email, limit: 1 });
    if (existing.data.length > 0) {
      customerId = existing.data[0].id;
      await stripe.customers.update(customerId, { metadata: { userId } });
    } else {
      const customer = await stripe.customers.create({
        email,
        metadata: { userId },
      });
      customerId = customer.id;
    }
  }

  // Check for an existing active or trialing subscription
  if (customerId) {
    const [activeSubs, trialingSubs] = await Promise.all([
      stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 }),
      stripe.subscriptions.list({ customer: customerId, status: "trialing", limit: 1 }),
    ]);
    const existingSubscription = activeSubs.data[0] || trialingSubs.data[0];

    if (existingSubscription) {
      const currentItem = existingSubscription.items.data[0];
      const currentPriceId = currentItem.price.id;

      // Same plan
      if (currentPriceId === priceId) {
        if (existingSubscription.cancel_at_period_end) {
          // Resume a subscription that was scheduled to cancel (pending downgrade)
          await stripe.subscriptions.update(existingSubscription.id, {
            cancel_at_period_end: false,
            metadata: { userId, pending_price_id: "" },
          });
        }
        return NextResponse.redirect(`${origin}/api/stripe/success`);
      }

      const currentOrder = PLAN_ORDER[currentPriceId] ?? -1;
      const newOrder = PLAN_ORDER[priceId] ?? -1;

      if (newOrder > currentOrder) {
        // Upgrade: immediate swap, prorate and reset billing cycle
        await stripe.subscriptions.update(existingSubscription.id, {
          items: [{ id: currentItem.id, price: priceId }],
          proration_behavior: "always_invoice",
          billing_cycle_anchor: "now",
          cancel_at_period_end: false,
          metadata: { userId, pending_price_id: "" },
        });
        // Propagate immediately — webhook will also fire as backup
        const newStatus = PRICE_STATUS_MAP[priceId];
        if (newStatus) {
          await updateProfileStatus(userId, newStatus);
        }
        return NextResponse.redirect(`${origin}/api/stripe/success?upgraded=1`);
      } else {
        // Downgrade: keep current plan until period end, then switch.
        // No DB update here — user retains current status until the subscription expires.
        // webhook customer.subscription.deleted will create the new subscription,
        // and customer.subscription.created will update the status.
        await stripe.subscriptions.update(existingSubscription.id, {
          cancel_at_period_end: true,
          metadata: { userId, pending_price_id: priceId },
        });
        return NextResponse.redirect(`${origin}/api/stripe/success?downgraded=1`);
      }
    }
  }

  // No active subscription: standard checkout flow
  const stripeSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    customer: customerId,
    customer_email: !customerId && email ? email : undefined,
    client_reference_id: userId,
    success_url: `${origin}/api/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pricing`,
    metadata: { userId },
  });

  return NextResponse.redirect(stripeSession.url!);
}
