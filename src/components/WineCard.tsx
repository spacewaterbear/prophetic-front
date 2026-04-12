"use client";

import { Wine } from "lucide-react";
import { memo } from "react";
import { useI18n } from "@/contexts/i18n-context";

interface WineListing {
  url: string | null;
  name: string | null;
  price: string | null;
  rating: string | null;
  region: string | null;
  country: string | null;
  vintage: string | null;
  in_stock: boolean | null;
  merchant: string | null;
  producer: string | null;
  image_url: string | null;
  appellation: string | null;
  bottle_size: string | null;
  price_amount: number | null;
  price_currency: string | null;
}

export interface WineSearchData {
  type: "wine_search_response";
  query: string;
  total_listings: number;
  listings: WineListing[];
  error_message: string | null;
  title?: string;
  subtitle?: string;
}

interface WineCardProps {
  data: WineSearchData;
}

const formatPrice = (
  price: string | null,
  amount: number | null,
  currency: string | null,
): string => {
  if (amount !== null && amount !== undefined) {
    const fmt =
      amount >= 10000
        ? `${(amount / 1000).toFixed(0)}K`
        : amount.toLocaleString("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          });
    return currency ? `${fmt} ${currency}` : fmt;
  }
  if (price) {
    const match = price.match(/[\d,]+(?:\.\d+)?/);
    if (match) return price.replace(/\s*(inc\.|ex\.).*$/i, "").trim();
  }
  return "N/A";
};

export const WineCard = memo(({ data }: WineCardProps) => {
  const { t } = useI18n();
  const { listings } = data;
  const title = data.title || t("cards.investmentAvailability");
  const subtitle = data.subtitle || t("cards.technicalNote");

  // Deduplicate by URL
  const seen = new Set<string>();
  const uniqueListings = listings.filter((l) => {
    const key = l.url || `${l.merchant}-${l.vintage}-${l.price}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const displayedListings = uniqueListings.slice(0, 4);

  if (displayedListings.length === 0) return null;

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-[16px] font-bold text-gray-900 dark:text-white">
          {title}
        </h2>
        <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-1 italic">
          {subtitle}
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {displayedListings.map((listing, index) => (
          <WineItem key={`wine-${index}`} listing={listing} query={data.query} />
        ))}
      </div>
    </div>
  );
});

WineCard.displayName = "WineCard";

const WineItem = memo(({ listing, query }: { listing: WineListing; query: string }) => {
  const priceLabel = formatPrice(
    listing.price,
    listing.price_amount,
    listing.price_currency,
  );

  return (
    <a
      href={listing.url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="block"
      onClick={(e) => !listing.url && e.preventDefault()}
    >
      <div className="border border-gray-200/20 bg-[#e6e6e6] dark:bg-gray-800 rounded-[24px] p-3">
        {/* Image area — wine icon with vintage overlay */}
        <div className="relative w-full aspect-square rounded-[24px] mb-2 overflow-hidden bg-white dark:bg-gray-900 flex items-center justify-center">
          <Wine className="w-12 h-12 text-[#7b1f3a] dark:text-[#c4596e] opacity-70" />

          {listing.vintage && (
            <div className="absolute top-3 left-3">
              <div className="bg-[#7b1f3a] rounded-full px-2.5 py-1 shadow-md">
                <span className="text-[11px] font-semibold text-white whitespace-nowrap">
                  {listing.vintage}
                </span>
              </div>
            </div>
          )}

          {/* Price badge */}
          <div className="absolute bottom-3 right-3">
            <div className="bg-white rounded-full px-3 py-1.5 shadow-md">
              <span className="text-[11px] font-semibold text-gray-900 whitespace-nowrap">
                {priceLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="flex flex-col px-1 text-center">
          <h3 className="text-[15px] font-bold text-gray-900 dark:text-white leading-tight line-clamp-2">
            {listing.merchant || listing.name || query}
          </h3>
          {listing.appellation && (
            <p className="text-[12px] font-medium text-gray-700 dark:text-gray-300 mt-0.5 line-clamp-1">
              {listing.appellation}
            </p>
          )}
          {listing.bottle_size && (
            <p className="text-[11px] font-light text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">
              {listing.bottle_size}
            </p>
          )}
          {listing.rating && (
            <p className="text-[10px] font-light text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">
              {listing.rating}
            </p>
          )}
        </div>
      </div>
    </a>
  );
});

WineItem.displayName = "WineItem";
