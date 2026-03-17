"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { ReactNode } from "react";
import { I18nProvider } from "@/contexts/i18n-context";
import { StripePricesProvider } from "@/contexts/stripe-prices-context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <I18nProvider>
          <StripePricesProvider>
            {children}
          </StripePricesProvider>
        </I18nProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
