import Stripe from "stripe";
import { NextResponse } from "next/server";

function formatPrice(price: Stripe.Price): string {
  if (!price.unit_amount || !price.currency) return "";
  const amount = price.unit_amount / 100;
  const symbol =
    price.currency === "eur" ? "€" : price.currency === "usd" ? "$" : price.currency.toUpperCase();
  const interval = price.recurring?.interval ?? "month";
  return `${symbol}${amount.toFixed(2)} / ${interval}`;
}

export async function GET() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const oraclePriceId = process.env.STRIPE_ORACLE_PRICE_ID;

  if (!secretKey || !oraclePriceId) {
    console.error("[Stripe prices] Missing env vars:", {
      STRIPE_SECRET_KEY: !!secretKey,
      STRIPE_ORACLE_PRICE_ID: !!oraclePriceId,
    });
    return NextResponse.json({ flash: null, discover: null, oracle: null }, { status: 500 });
  }

  const flashPriceId = process.env.STRIPE_FLASH_PRICE_ID;
  const discoverPriceId = process.env.STRIPE_DISCOVER_PRICE_ID;

  if (!flashPriceId || !discoverPriceId) {
    console.error("[Stripe prices] Missing env vars:", {
      STRIPE_FLASH_PRICE_ID: !!flashPriceId,
      STRIPE_DISCOVER_PRICE_ID: !!discoverPriceId,
    });
    return NextResponse.json({ flash: null, discover: null, oracle: null }, { status: 500 });
  }

  const stripe = new Stripe(secretKey);
  try {
    const [flash, discover, oracle] = await Promise.all([
      stripe.prices.retrieve(flashPriceId),
      stripe.prices.retrieve(discoverPriceId),
      stripe.prices.retrieve(oraclePriceId),
    ]);

    return NextResponse.json({
      flash: formatPrice(flash),
      discover: formatPrice(discover),
      oracle: formatPrice(oracle),
    });
  } catch (err) {
    console.error("[Stripe prices] Failed to fetch:", err);
    return NextResponse.json({ flash: null, discover: null, oracle: null }, { status: 500 });
  }
}
