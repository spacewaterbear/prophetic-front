import { auth } from "@/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
// Note: checkout/portal links use <a> (not Link) to force full navigation for HTTP redirects

const PLANS = [
  {
    name: "Discover",
    description: "Essential luxury investment intelligence for the discerning beginner.",
    productId: process.env.POLAR_DISCOVER_ID!,
    features: [
      "Access to Discover agent",
      "Luxury asset market overviews",
      "Investment category vignettes",
      "10 categories covered",
    ],
  },
  {
    name: "Intelligence",
    description: "Advanced analysis and portfolio insights for serious collectors.",
    productId: process.env.POLAR_INTELLIGENCE_ID!,
    features: [
      "Everything in Discover",
      "Access to Intelligence agent",
      "Deep market analysis",
      "Portfolio tier recommendations",
      "Artist & market data",
    ],
    highlighted: true,
  },
  {
    name: "Oracle",
    description: "Complete advisory suite for professional luxury asset managers.",
    productId: process.env.POLAR_ORACLE_ID!,
    features: [
      "Everything in Intelligence",
      "Access to Oracle agent",
      "Priority AI responses",
      "Full portfolio orchestration",
      "Exclusive market signals",
    ],
  },
];

export default async function PricingPage() {
  const session = await auth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userStatus = (session?.user as any)?.status as string | undefined;
  const isAuthorized = userStatus && userStatus !== "unauthorized";

  const userId = session?.user?.id ?? "";
  const userEmail = session?.user?.email ?? "";

  return (
    <div className="min-h-screen bg-[rgb(249,248,244)] dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-950 flex flex-col items-center justify-center p-4 sm:p-8">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[rgb(230,220,210)]/40 dark:bg-gray-800/30 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[rgb(230,220,210)]/40 dark:bg-gray-800/30 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-5xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full overflow-hidden">
            <Image
              src="https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/logo/flavicon_new.svg"
              alt="Prophetic Orchestra"
              width={64}
              height={64}
              className="w-full h-full object-cover dark:hidden"
            />
            <Image
              src="https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/logo/flavicon_new_dark.svg"
              alt="Prophetic Orchestra"
              width={64}
              height={64}
              className="w-full h-full object-cover hidden dark:block"
            />
          </div>
          <h1 className="text-4xl sm:text-5xl font-light text-gray-900 dark:text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-w-xl mx-auto">
            Unlock Prophetic Orchestra's luxury investment intelligence — curated for collectors, advisors, and connoisseurs.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {PLANS.map((plan) => {
            const checkoutUrl =
              `/api/polar/checkout?products=${plan.productId}` +
              (userId ? `&customerExternalId=${userId}` : "") +
              (userEmail ? `&customerEmail=${encodeURIComponent(userEmail)}` : "");

            return (
              <Card
                key={plan.name}
                className={`relative flex flex-col p-8 ${
                  plan.highlighted
                    ? "bg-gray-900 dark:bg-white border-gray-900 dark:border-white text-white dark:text-gray-900 shadow-2xl scale-105"
                    : "bg-white/90 dark:bg-gray-800/90 border-gray-200 dark:border-gray-700"
                } backdrop-blur-xl shadow-xl transition-transform`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-amber-500 text-white text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h2
                    className={`text-2xl font-light mb-2 ${
                      plan.highlighted ? "text-white dark:text-gray-900" : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {plan.name}
                  </h2>
                  <p
                    className={`text-sm leading-relaxed ${
                      plan.highlighted ? "text-gray-300 dark:text-gray-600" : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {plan.description}
                  </p>
                </div>

                <ul className="space-y-2 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <span
                        className={`mt-0.5 flex-shrink-0 ${
                          plan.highlighted ? "text-amber-400 dark:text-amber-600" : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        ✓
                      </span>
                      <span
                        className={
                          plan.highlighted ? "text-gray-200 dark:text-gray-700" : "text-gray-700 dark:text-gray-300"
                        }
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="space-y-2">
                  <Button
                    asChild
                    className={`w-full h-11 rounded-xl font-medium ${
                      plan.highlighted
                        ? "bg-white text-gray-900 hover:bg-gray-100 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800"
                        : "bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                    }`}
                  >
                    <a href={checkoutUrl}>
                      {userStatus === plan.name.toLowerCase() ? "Current plan" : `Subscribe to ${plan.name}`}
                    </a>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Footer */}
        <div className="text-center space-y-2">
          {isAuthorized && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <a href="/api/polar/portal" className="text-gray-900 dark:text-white font-medium underline hover:opacity-75">
                Manage existing subscription
              </a>
            </p>
          )}
          {!session && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Already have an account?{" "}
              <Link href="/login" className="text-gray-900 dark:text-white font-medium underline hover:opacity-75">
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
