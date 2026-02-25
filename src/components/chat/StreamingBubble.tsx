"use client";

import { lazy, Suspense } from "react";
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

interface StreamingBubbleProps {
  streamingMessage: string;
  streamingMarketplaceData: MarketplaceData | null;
  streamingRealEstateData: RealEstateData | null;
  streamingVignetteData: VignetteData[] | null;
  streamingClothesSearchData: ClothesSearchData | null;
  streamingVignetteCategory: string | null;
  showStreamingIndicator: boolean;
  isLoading: boolean;
  handleVignetteClick: (vignette: VignetteData) => void;
  handleBackToCategory: (category: string) => void;
}

export function StreamingBubble({
  streamingMessage,
  streamingMarketplaceData,
  streamingRealEstateData,
  streamingVignetteData,
  streamingClothesSearchData,
  streamingVignetteCategory,
  showStreamingIndicator,
  isLoading,
  handleVignetteClick,
  handleBackToCategory,
}: StreamingBubbleProps) {
  const { language } = useI18n();
  const categoryNames = getCategoryDisplayNames(language);
  const hasContent =
    streamingMessage ||
    streamingMarketplaceData ||
    streamingRealEstateData ||
    streamingVignetteData ||
    streamingClothesSearchData;

  if (!hasContent) return null;

  return (
    <div className="flex gap-2 sm:gap-4 items-start justify-start">
      <AIAvatar />
      <div className="max-w-[90vw] sm:max-w-3xl lg:max-w-4xl px-3 sm:px-4 py-4 sm:py-5 rounded-2xl overflow-hidden bg-[rgb(249,248,244)] dark:bg-[rgb(1,1,0)] text-gray-900 dark:text-white">
        {streamingMessage && (
          <Suspense
            fallback={<div className="text-base text-gray-400">Loading...</div>}
          >
            <Markdown
              content={streamingMessage}
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
            />
          </Suspense>
        )}
        {streamingMarketplaceData && (
          <div className={streamingMessage ? "mt-4" : ""}>
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
              streamingMessage || streamingMarketplaceData ? "mt-4" : ""
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
              streamingMessage ||
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
              streamingMessage ||
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
        {showStreamingIndicator && (
          <div className="mt-2">
            <TypingIndicator />
          </div>
        )}
        {isLoading && !streamingMessage && <TypingIndicator />}
      </div>
    </div>
  );
}
