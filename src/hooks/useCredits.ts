"use client";

import { useState, useEffect } from "react";

const TOTAL_FREE_CREDITS = 100;

interface UseCreditsResult {
  credits: number | null;
  isTester: boolean;
  creditsExhausted: boolean;
  isLoading: boolean;
  refresh: () => void;
}

const cacheKey = (userId: string) => `credits_cache_${userId}`;

export function useCredits(userId: string | undefined, isFreeUser: boolean): UseCreditsResult {
  const [credits, setCredits] = useState<number | null>(() => {
    if (!userId || !isFreeUser || typeof window === "undefined") return null;
    const cached = localStorage.getItem(cacheKey(userId));
    return cached !== null ? Number(cached) : null;
  });
  const [isTester, setIsTester] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!userId || !isFreeUser) return;

    const fetchCredits = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/credits");
        if (response.ok) {
          const data = await response.json();
          const value = data.credits ?? TOTAL_FREE_CREDITS;
          setIsTester(data.isTester ?? false);
          setCredits(value);
          localStorage.setItem(cacheKey(userId), String(value));
        }
      } catch (error) {
        console.error("Error fetching credits:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCredits();
  }, [userId, isFreeUser, refreshKey]);

  return {
    credits,
    isTester,
    creditsExhausted: isFreeUser && !isTester && credits !== null && credits <= 0,
    isLoading,
    refresh: () => setRefreshKey((k) => k + 1),
  };
}
