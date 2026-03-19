import { auth } from "@/auth";
import Stripe from "stripe";
import PricingContent from "./PricingContent";

function formatStripePrice(price: Stripe.Price): string {
  if (!price.unit_amount || !price.currency) return "—";
  const amount = price.unit_amount / 100;
  const symbol =
    price.currency === "eur" ? "€" : price.currency === "usd" ? "$" : price.currency.toUpperCase();
  return `${symbol}${amount.toFixed(2)}`;
}

async function fetchStripePrices(): Promise<{ discover: string; flash: string; intelligence: string; oracle: string }> {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const [discover, flash, intelligence, oracle] = await Promise.all([
      stripe.prices.retrieve(process.env.STRIPE_DISCOVER_PRICE_ID!),
      stripe.prices.retrieve(process.env.STRIPE_FLASH_PRICE_ID!),
      stripe.prices.retrieve(process.env.STRIPE_INTELLIGENCE_PRICE_ID!),
      stripe.prices.retrieve(process.env.STRIPE_ORACLE_PRICE_ID!),
    ]);
    return {
      discover: formatStripePrice(discover),
      flash: formatStripePrice(flash),
      intelligence: formatStripePrice(intelligence),
      oracle: formatStripePrice(oracle),
    };
  } catch {
    return { discover: "€9.99", flash: "€19.99", intelligence: "€29.99", oracle: "€149.99" };
  }
}

export default async function PricingPage() {
  const session = await auth();
  const stripePrices = await fetchStripePrices();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userStatus = (session?.user as any)?.status as string | undefined;
  const isAuthorized = userStatus && userStatus !== "unauthorized";

  return (
    <PricingContent
      userStatus={userStatus}
      isAuthorized={!!isAuthorized}
      hasSession={!!session}
      discoverPriceId={process.env.STRIPE_DISCOVER_PRICE_ID ?? ""}
      flashPriceId={process.env.STRIPE_FLASH_PRICE_ID ?? ""}
      intelligencePriceId={process.env.STRIPE_INTELLIGENCE_PRICE_ID ?? ""}
      oraclePriceId={process.env.STRIPE_ORACLE_PRICE_ID ?? ""}
      discoverPrice={stripePrices.discover}
      flashPrice={stripePrices.flash}
      intelligencePrice={stripePrices.intelligence}
      oraclePrice={stripePrices.oracle}
    />
  );
}
