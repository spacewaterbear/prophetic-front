"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { LOGO_DARK, LOGO_LIGHT } from "@/lib/constants/logos";
import { useI18n } from "@/contexts/i18n-context";
// Note: checkout/portal links use <a> (not Link) to force full navigation for HTTP redirects

interface PricingContentProps {
  userStatus: string | undefined;
  isAuthorized: boolean;
  hasSession: boolean;
  discoverPriceId: string;
  flashPriceId: string;
  oraclePriceId: string;
  discoverPrice: string;
  flashPrice: string;
  oraclePrice: string;
}

export default function PricingContent({
  userStatus,
  isAuthorized,
  hasSession,
  discoverPriceId,
  flashPriceId,
  oraclePriceId,
  discoverPrice,
  flashPrice,
  oraclePrice,
}: PricingContentProps) {
  const { t } = useI18n();

  const PLANS = [
    {
      name: "Flash",
      price: flashPrice,
      priceDetail: t("pricing.perMonth"),
      description: t("pricing.flash.description"),
      priceId: flashPriceId,
      highlighted: false,
      features: [
        t("pricing.flash.feature1"),
        t("pricing.flash.feature2"),
        t("pricing.flash.feature3"),
        t("pricing.flash.feature4"),
        t("pricing.flash.feature5"),
      ],
      cta: t("pricing.flash.cta"),
    },
    {
      name: "Discover",
      price: discoverPrice,
      priceDetail: t("pricing.perMonth"),
      description: t("pricing.discover.description"),
      priceId: discoverPriceId,
      highlighted: true,
      features: [
        t("pricing.discover.feature1"),
        t("pricing.discover.feature2"),
        t("pricing.discover.feature3"),
        t("pricing.discover.feature4"),
      ],
      cta: t("pricing.discover.cta"),
    },
    {
      name: "Oracle",
      price: oraclePrice,
      priceDetail: t("pricing.perMonth"),
      description: t("pricing.oracle.description"),
      priceId: oraclePriceId,
      highlighted: false,
      features: [
        t("pricing.oracle.feature1"),
        t("pricing.oracle.feature2"),
        t("pricing.oracle.feature3"),
        t("pricing.oracle.feature4"),
        t("pricing.oracle.feature5"),
        t("pricing.oracle.feature6"),
        t("pricing.oracle.feature7"),
        t("pricing.oracle.feature8"),
      ],
      cta: t("pricing.oracle.cta"),
    },
  ];

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
              src={LOGO_LIGHT}
              alt="Prophetic Orchestra"
              width={64}
              height={64}
              className="w-full h-full object-cover dark:hidden"
            />
            <Image
              src={LOGO_DARK}
              alt="Prophetic Orchestra"
              width={64}
              height={64}
              className="w-full h-full object-cover hidden dark:block"
            />
          </div>
          <h1 className="text-4xl sm:text-5xl font-light text-gray-900 dark:text-white mb-4">
            {t("pricing.chooseYourPlan")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-w-xl mx-auto">
            {t("pricing.subtitle")}
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 mb-10">
          {PLANS.map((plan) => {
            const checkoutUrl = !hasSession
              ? "/login"
              : plan.priceId
              ? `/api/stripe/checkout?priceId=${plan.priceId}`
              : "/chat";

            return (
              <Card
                key={plan.name}
                className={`relative flex flex-col p-8 ${
                  plan.highlighted
                    ? "bg-gray-900 dark:bg-white border-gray-900 dark:border-white text-white dark:text-gray-900 shadow-2xl"
                    : "bg-white/90 dark:bg-gray-800/90 border-gray-200 dark:border-gray-700"
                } backdrop-blur-xl shadow-xl transition-transform`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-amber-500 text-white text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide whitespace-nowrap">
                      {t("pricing.mostPopular")}
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h2
                    className={`text-2xl font-light mb-3 ${
                      plan.highlighted ? "text-white dark:text-gray-900" : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {plan.name}
                  </h2>
                  <div className="mb-3">
                    <span
                      className={`text-3xl font-semibold ${
                        plan.highlighted ? "text-white dark:text-gray-900" : "text-gray-900 dark:text-white"
                      }`}
                    >
                      {plan.price}
                    </span>
                    <span
                      className={`text-sm ml-1 ${
                        plan.highlighted ? "text-gray-300 dark:text-gray-600" : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {plan.priceDetail}
                    </span>
                  </div>
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
                      {userStatus === plan.name.toLowerCase() ? t("pricing.currentPlan") : plan.cta}
                    </a>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Footer */}
        <div className="text-center space-y-2">
          {hasSession && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <Link href="/chat" className="text-gray-900 dark:text-white font-medium underline hover:opacity-75">
                ← {t("pricing.backToChat")}
              </Link>
            </p>
          )}
          {isAuthorized && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <a href="/api/stripe/portal" className="text-gray-900 dark:text-white font-medium underline hover:opacity-75">
                {t("pricing.manageSubscription")}
              </a>
            </p>
          )}
          {!hasSession && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("pricing.alreadyHaveAccount")}{" "}
              <Link href="/login" className="text-gray-900 dark:text-white font-medium underline hover:opacity-75">
                {t("pricing.signIn")}
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
