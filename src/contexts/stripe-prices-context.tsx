"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface StripePrices {
  intelligence: string | null;
  oracle: string | null;
}

const StripePricesContext = createContext<StripePrices>({ intelligence: null, oracle: null });

export function StripePricesProvider({ children }: { children: ReactNode }) {
  const [prices, setPrices] = useState<StripePrices>({ intelligence: null, oracle: null });

  useEffect(() => {
    fetch("/api/stripe/prices")
      .then((r) => r.json())
      .then(setPrices)
      .catch(() => {});
  }, []);

  return <StripePricesContext.Provider value={prices}>{children}</StripePricesContext.Provider>;
}

export const useStripePrices = () => useContext(StripePricesContext);
