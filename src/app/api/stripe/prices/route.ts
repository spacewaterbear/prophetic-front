import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function formatPrice(price: Stripe.Price): string {
  if (!price.unit_amount || !price.currency) return "";
  const amount = price.unit_amount / 100;
  const symbol =
    price.currency === "eur" ? "€" : price.currency === "usd" ? "$" : price.currency.toUpperCase();
  const interval = price.recurring?.interval ?? "month";
  return `${symbol}${amount.toFixed(2)} / ${interval}`;
}

export async function GET() {
  try {
    const [intelligence, oracle] = await Promise.all([
      stripe.prices.retrieve(process.env.STRIPE_INTELLIGENCE_PRICE_ID!),
      stripe.prices.retrieve(process.env.STRIPE_ORACLE_PRICE_ID!),
    ]);

    return NextResponse.json({
      intelligence: formatPrice(intelligence),
      oracle: formatPrice(oracle),
    });
  } catch (err) {
    console.error("[Stripe prices] Failed to fetch:", err);
    return NextResponse.json({ intelligence: null, oracle: null }, { status: 500 });
  }
}
