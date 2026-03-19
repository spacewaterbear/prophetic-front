import Stripe from "stripe";
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const origin =
    req.headers.get("origin") ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  const customers = await stripe.customers.list({
    email: session.user.email,
    limit: 1,
  });

  if (!customers.data.length) {
    return NextResponse.redirect(new URL("/pricing", req.url));
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customers.data[0].id,
    return_url: `${origin}/chat`,
  });

  return NextResponse.redirect(portalSession.url);
}
