"use client";

import { lazy, memo, Suspense, useState, useEffect, useRef } from "react";
import { AIAvatar } from "./AIAvatar";
import { TypingIndicator } from "@/components/TypingIndicator";
import {
  MarketplaceData,
  RealEstateData,
} from "@/types/chat";
import { useI18n } from "@/contexts/i18n-context";
import { getCategoryDisplayNames } from "@/lib/translations";
import { VignetteData } from "@/types/vignettes";
import { ClothesSearchData } from "@/components/ClothesSearchCard";
import { JewelrySearchData } from "@/components/JewelryCard";
import { CarsSearchData } from "@/components/CarsCard";
import { WatchesSearchData } from "@/components/WatchesCard";
import { WhiskySearchData } from "@/components/WhiskyCard";
import { WineSearchData } from "@/components/WineCard";
import { CardsSearchData } from "@/components/SportsCardsCard";

const Markdown = lazy(() =>
  import("@/components/Markdown").then((mod) => ({ default: mod.Markdown })),
);
const MarketplaceCard = lazy(() =>
  import("@/components/MarketplaceCard").then((mod) => ({
    default: mod.MarketplaceCard,
  })),
);
const RealEstateCard = lazy(() =>
  import("@/components/RealEstateCard").then((mod) => ({
    default: mod.RealEstateCard,
  })),
);
const VignetteGridCard = lazy(() =>
  import("@/components/VignetteGridCard").then((mod) => ({
    default: mod.VignetteGridCard,
  })),
);
const ClothesSearchCard = lazy(() =>
  import("@/components/ClothesSearchCard").then((mod) => ({
    default: mod.ClothesSearchCard,
  })),
);
const JewelryCard = lazy(() =>
  import("@/components/JewelryCard").then((mod) => ({
    default: mod.JewelryCard,
  })),
);
const CarsCard = lazy(() =>
  import("@/components/CarsCard").then((mod) => ({
    default: mod.CarsCard,
  })),
);
const WatchesCard = lazy(() =>
  import("@/components/WatchesCard").then((mod) => ({
    default: mod.WatchesCard,
  })),
);
const WhiskyCard = lazy(() =>
  import("@/components/WhiskyCard").then((mod) => ({
    default: mod.WhiskyCard,
  })),
);
const WineCard = lazy(() =>
  import("@/components/WineCard").then((mod) => ({
    default: mod.WineCard,
  })),
);
const SportsCardsCard = lazy(() =>
  import("@/components/SportsCardsCard").then((mod) => ({
    default: mod.SportsCardsCard,
  })),
);

interface StreamingBubbleProps {
  streamingMessage: string;
  streamingWordsToHighlight?: string[] | null;
  streamingMarketplaceData: MarketplaceData | null;
  streamingRealEstateData: RealEstateData | null;
  streamingVignetteData: VignetteData[] | null;
  streamingClothesSearchData: ClothesSearchData | null;
  streamingJewelrySearchData: JewelrySearchData | null;
  streamingCarsSearchData: CarsSearchData | null;
  streamingWatchesSearchData: WatchesSearchData | null;
  streamingWhiskySearchData: WhiskySearchData | null;
  streamingWineSearchData: WineSearchData | null;
  streamingCardsSearchData: CardsSearchData | null;
  streamingVignetteCategory: string | null;
  showStreamingIndicator: boolean;
  isLoading: boolean;
  currentStatus?: string;
  lastActivityAt?: number;
  handleVignetteClick: (vignette: VignetteData) => void;
  handleBackToCategory: (category: string) => void;
}

const CHAR_INTERVAL_MS = 10; // ~100 chars/sec

function useTypewriter(source: string): string {
  const [displayed, setDisplayed] = useState("");
  const pendingRef = useRef("");
  const processedRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!source) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      // flush any remaining pending chars immediately when stream ends
      if (pendingRef.current.length > 0) {
        setDisplayed((prev) => prev + pendingRef.current);
        pendingRef.current = "";
      }
      processedRef.current = 0;
      return;
    }

    const newChars = source.slice(processedRef.current);
    if (newChars.length > 0) {
      pendingRef.current += newChars;
      processedRef.current = source.length;
    }

    if (!timerRef.current) {
      timerRef.current = setInterval(() => {
        if (pendingRef.current.length === 0) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          return;
        }
        const char = pendingRef.current[0];
        pendingRef.current = pendingRef.current.slice(1);
        setDisplayed((prev) => prev + char);
      }, CHAR_INTERVAL_MS);
    }
  }, [source]);

  // reset displayed text when source resets to empty
  useEffect(() => {
    if (!source) setDisplayed("");
  }, [source]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return displayed;
}

export const StreamingBubble = memo(function StreamingBubble({
  streamingMessage,
  streamingWordsToHighlight,
  streamingMarketplaceData,
  streamingRealEstateData,
  streamingVignetteData,
  streamingClothesSearchData,
  streamingJewelrySearchData,
  streamingCarsSearchData,
  streamingWatchesSearchData,
  streamingWhiskySearchData,
  streamingWineSearchData,
  streamingCardsSearchData,
  streamingVignetteCategory,
  showStreamingIndicator,
  isLoading,
  currentStatus,
  lastActivityAt,
  handleVignetteClick,
  handleBackToCategory,
}: StreamingBubbleProps) {
  const { language } = useI18n();
  const displayedMessage = useTypewriter(streamingMessage);
  const categoryNames = getCategoryDisplayNames(language);
  const hasContent =
    displayedMessage ||
    streamingMessage ||
    streamingMarketplaceData ||
    streamingRealEstateData ||
    streamingVignetteData ||
    streamingClothesSearchData ||
    streamingJewelrySearchData ||
    streamingCarsSearchData ||
    streamingWatchesSearchData ||
    streamingWhiskySearchData ||
    streamingWineSearchData ||
    streamingCardsSearchData;

  if (!hasContent) return null;

  return (
    <div className="flex gap-2 sm:gap-4 items-start justify-start">
      <AIAvatar />
      <div className="max-w-[90vw] sm:max-w-3xl lg:max-w-4xl px-3 sm:px-4 py-4 sm:py-5 rounded-2xl overflow-hidden bg-[rgb(249,248,244)] dark:bg-[rgb(1,1,0)] text-gray-900 dark:text-white">
        {displayedMessage && (
          <Suspense
            fallback={<div className="text-base text-gray-400">Loading...</div>}
          >
            <Markdown
              content={displayedMessage}
              className="text-base"
              categoryName={
                streamingVignetteCategory
                  ? categoryNames[streamingVignetteCategory]
                  : undefined
              }
              onCategoryClick={
                streamingVignetteCategory
                  ? () => handleBackToCategory(streamingVignetteCategory)
                  : undefined
              }
              wordsToHighlight={streamingWordsToHighlight}
            />
          </Suspense>
        )}
        {streamingMarketplaceData && (
          <div className={displayedMessage ? "mt-4" : ""}>
            <Suspense
              fallback={
                <div className="text-base text-gray-400">
                  Loading marketplace data...
                </div>
              }
            >
              <MarketplaceCard data={streamingMarketplaceData} />
            </Suspense>
          </div>
        )}
        {streamingRealEstateData && (
          <div
            className={
              displayedMessage || streamingMarketplaceData ? "mt-4" : ""
            }
          >
            <Suspense
              fallback={
                <div className="text-base text-gray-400">
                  Loading real estate data...
                </div>
              }
            >
              <RealEstateCard data={streamingRealEstateData} />
            </Suspense>
          </div>
        )}
        {streamingVignetteData && (
          <div
            className={
              displayedMessage ||
              streamingMarketplaceData ||
              streamingRealEstateData
                ? "mt-4"
                : ""
            }
          >
            <Suspense
              fallback={
                <div className="text-base text-gray-400">
                  Loading vignettes...
                </div>
              }
            >
              <VignetteGridCard
                data={streamingVignetteData}
                onVignetteClick={handleVignetteClick}
              />
            </Suspense>
          </div>
        )}
        {streamingClothesSearchData && (
          <div
            className={
              displayedMessage ||
              streamingMarketplaceData ||
              streamingRealEstateData ||
              streamingVignetteData
                ? "mt-4"
                : ""
            }
          >
            <Suspense
              fallback={
                <div className="text-base text-gray-400">
                  Loading fashion items...
                </div>
              }
            >
              <ClothesSearchCard data={streamingClothesSearchData} />
            </Suspense>
          </div>
        )}
        {streamingJewelrySearchData && (
          <div
            className={
              displayedMessage ||
              streamingMarketplaceData ||
              streamingRealEstateData ||
              streamingVignetteData ||
              streamingClothesSearchData
                ? "mt-4"
                : ""
            }
          >
            <Suspense
              fallback={
                <div className="text-base text-gray-400">
                  Loading jewelry...
                </div>
              }
            >
              <JewelryCard data={streamingJewelrySearchData} />
            </Suspense>
          </div>
        )}
        {streamingCarsSearchData && (
          <div
            className={
              displayedMessage ||
              streamingMarketplaceData ||
              streamingRealEstateData ||
              streamingVignetteData ||
              streamingClothesSearchData ||
              streamingJewelrySearchData
                ? "mt-4"
                : ""
            }
          >
            <Suspense
              fallback={
                <div className="text-base text-gray-400">
                  Loading cars...
                </div>
              }
            >
              <CarsCard data={streamingCarsSearchData} />
            </Suspense>
          </div>
        )}
        {streamingWatchesSearchData && (
          <div
            className={
              displayedMessage ||
              streamingMarketplaceData ||
              streamingRealEstateData ||
              streamingVignetteData ||
              streamingClothesSearchData ||
              streamingJewelrySearchData ||
              streamingCarsSearchData
                ? "mt-4"
                : ""
            }
          >
            <Suspense
              fallback={
                <div className="text-base text-gray-400">
                  Loading watches...
                </div>
              }
            >
              <WatchesCard data={streamingWatchesSearchData} />
            </Suspense>
          </div>
        )}
        {streamingWhiskySearchData && (
          <div
            className={
              displayedMessage ||
              streamingMarketplaceData ||
              streamingRealEstateData ||
              streamingVignetteData ||
              streamingClothesSearchData ||
              streamingJewelrySearchData ||
              streamingCarsSearchData ||
              streamingWatchesSearchData
                ? "mt-4"
                : ""
            }
          >
            <Suspense
              fallback={
                <div className="text-base text-gray-400">
                  Loading whisky...
                </div>
              }
            >
              <WhiskyCard data={streamingWhiskySearchData} />
            </Suspense>
          </div>
        )}
        {streamingWineSearchData && (
          <div
            className={
              displayedMessage ||
              streamingMarketplaceData ||
              streamingRealEstateData ||
              streamingVignetteData ||
              streamingClothesSearchData ||
              streamingJewelrySearchData ||
              streamingCarsSearchData ||
              streamingWatchesSearchData ||
              streamingWhiskySearchData
                ? "mt-4"
                : ""
            }
          >
            <Suspense
              fallback={
                <div className="text-base text-gray-400">
                  Loading wine...
                </div>
              }
            >
              <WineCard data={streamingWineSearchData} />
            </Suspense>
          </div>
        )}
        {streamingCardsSearchData && (
          <div
            className={
              displayedMessage ||
              streamingMarketplaceData ||
              streamingRealEstateData ||
              streamingVignetteData ||
              streamingClothesSearchData ||
              streamingJewelrySearchData ||
              streamingCarsSearchData ||
              streamingWatchesSearchData ||
              streamingWhiskySearchData ||
              streamingWineSearchData
                ? "mt-4"
                : ""
            }
          >
            <Suspense
              fallback={
                <div className="text-base text-gray-400">
                  Loading sports cards...
                </div>
              }
            >
              <SportsCardsCard data={streamingCardsSearchData} />
            </Suspense>
          </div>
        )}
        {isLoading && (
          <div className={hasContent ? "mt-2" : ""}>
            <TypingIndicator statusText={currentStatus} lastActivityAt={lastActivityAt} />
          </div>
        )}
      </div>
    </div>
  );
});
