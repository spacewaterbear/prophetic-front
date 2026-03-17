import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const priceId = searchParams.get("priceId");
  const userId = searchParams.get("userId");
  const email = searchParams.get("email");

  if (!priceId) {
    return NextResponse.json({ error: "Missing priceId" }, { status: 400 });
  }

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
      if (userId) {
        await stripe.customers.update(customerId, { metadata: { userId } });
      }
    } else if (userId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { userId },
      });
      customerId = customer.id;
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    customer: customerId,
    customer_email: !customerId && email ? email : undefined,
    client_reference_id: userId || undefined,
    success_url: `${origin}/chat?checkout=success`,
    cancel_url: `${origin}/pricing`,
    metadata: userId ? { userId } : {},
  });

  return NextResponse.redirect(session.url!);
}
