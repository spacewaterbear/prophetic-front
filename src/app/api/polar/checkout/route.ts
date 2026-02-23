import { Checkout } from "@polar-sh/supabase";

// includeCheckoutId: false — the SDK would URL-encode {CHECKOUT_ID} via searchParams,
// making it unrecognizable to Polar. Polar appends checkoutId automatically anyway.
export const GET = Checkout({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  successUrl: process.env.POLAR_SUCCESS_URL!,
  server: "sandbox",
  includeCheckoutId: false,
});
