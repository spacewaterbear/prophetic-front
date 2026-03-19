import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICE_STATUS_MAP: Record<string, string> = {
  [process.env.STRIPE_FLASH_PRICE_ID!]: "flash",
  [process.env.STRIPE_DISCOVER_PRICE_ID!]: "discover",
  [process.env.STRIPE_INTELLIGENCE_PRICE_ID!]: "intelligence",
  [process.env.STRIPE_ORACLE_PRICE_ID!]: "oracle",
};

const STATUS_COLUMN =
  process.env.NEXT_PUBLIC_SPECIALITY === "art" ? "art_status" : "status";

export async function GET(req: NextRequest) {
  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");
  const upgraded = searchParams.get("upgraded");
  const downgraded = searchParams.get("downgraded");

  // When coming from Stripe Checkout, update the profile immediately.
  // The webhook also handles this asynchronously as a backup.
  if (sessionId) {
    try {
      const checkoutSession = await stripe.checkout.sessions.retrieve(
        sessionId,
        { expand: ["subscription"] },
      );

      const userId =
        checkoutSession.client_reference_id ||
        checkoutSession.metadata?.userId;

      if (userId && checkoutSession.subscription) {
        const subscription =
          checkoutSession.subscription as Stripe.Subscription;
        const priceId = subscription.items.data[0]?.price.id;
        const newStatus = PRICE_STATUS_MAP[priceId];

        if (newStatus) {
          const supabase = createAdminClient();
          const { error } = await supabase
            .from("profiles")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .update({ [STATUS_COLUMN]: newStatus as any })
            .eq("id", userId);
          if (error) {
            console.error("[Stripe Success] Supabase update failed:", error);
          }
        }
      }
    } catch (err) {
      console.error("[Stripe Success] Failed to update profile:", err);
    }
  }

  const redirectPath =
    upgraded === "1"
      ? "/chat?upgraded=true"
      : downgraded === "1"
        ? "/chat?downgraded=true"
        : "/chat?checkout=success";
  return NextResponse.redirect(`${origin}${redirectPath}`);
}
