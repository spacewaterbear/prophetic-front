import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const ALLOWED_PRICE_IDS = new Set([
  process.env.STRIPE_INTELLIGENCE_PRICE_ID,
  process.env.STRIPE_ORACLE_PRICE_ID,
]);

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const priceId = searchParams.get("priceId");

  if (!priceId || !ALLOWED_PRICE_IDS.has(priceId)) {
    return NextResponse.json({ error: "Invalid priceId" }, { status: 400 });
  }

  // Always use the authenticated user's ID and email — ignore query params
  const userId = session.user.id;
  const email = session.user.email ?? undefined;

  const origin =
    req.headers.get("origin") ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

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
