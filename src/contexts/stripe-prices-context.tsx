"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, type StripePricesResponse } from "@/lib/api";

type StripePrices = StripePricesResponse;

const CACHE_KEY = "stripe_prices_cache";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface PricesCache {
  prices: StripePrices;
  fetchedAt: number;
}

function getCachedPrices(): StripePrices | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache: PricesCache = JSON.parse(raw);
    if (Date.now() - cache.fetchedAt > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return cache.prices;
  } catch {
    return null;
  }
}

function cachePrices(prices: StripePrices) {
  try {
    const cache: PricesCache = { prices, fetchedAt: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore storage errors
  }
}

const StripePricesContext = createContext<StripePrices>({ intelligence: null, oracle: null });

export function StripePricesProvider({ children }: { children: ReactNode }) {
  const [prices, setPrices] = useState<StripePrices>({ intelligence: null, oracle: null });

  useEffect(() => {
    const cached = getCachedPrices();
    if (cached) {
      setPrices(cached);
      return;
    }

    api.get<StripePricesResponse>("/api/stripe/prices")
      .then((data) => {
        cachePrices(data);
        setPrices(data);
      })
      .catch((err) => console.error("[StripePrices] Failed to fetch:", err));
  }, []);

  return <StripePricesContext.Provider value={prices}>{children}</StripePricesContext.Provider>;
}

export const useStripePrices = () => useContext(StripePricesContext);
