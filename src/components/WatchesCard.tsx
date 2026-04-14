"use client";

import Image from "next/image";
import { Watch } from "lucide-react";
import { memo, useState } from "react";
import { useI18n } from "@/contexts/i18n-context";

interface WatchListing {
    brand: string;
    collection: string;
    reference: string;
    market_price: string | null;
    market_price_amount: number | null;
    market_price_currency: string | null;
    retail_price: string | null;
    url: string;
    image_url: string | null;
    description: string | null;
}

export interface WatchesSearchData {
    type: "watch_search_response";
    query: string;
    total_listings: number;
    listings: WatchListing[];
    error_message: string | null;
    title?: string;
    subtitle?: string;
}

interface WatchesCardProps {
    data: WatchesSearchData;
}

const formatPrice = (amount: number | null, currency: string | null): string => {
    if (amount === null || amount === undefined) return "N/A";
    const fmt = amount >= 10000
        ? `${(amount / 1000).toFixed(0)}K`
        : amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    return currency ? `${fmt} ${currency}` : fmt;
};

export const WatchesCard = memo(({ data }: WatchesCardProps) => {
    const { t } = useI18n();
    const { listings } = data;
    const title = data.title || t("cards.investmentAvailability");
    const subtitle = data.subtitle || t("cards.technicalNote");

    const validListings = listings.filter((l) => l.image_url);
    const displayedListings = validListings.slice(0, 4);

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
                    <WatchItem key={`watch-${index}`} listing={listing} />
                ))}
            </div>
        </div>
    );
});

WatchesCard.displayName = "WatchesCard";

const WatchItem = memo(({ listing }: { listing: WatchListing }) => {
    const [imageError, setImageError] = useState(false);

    return (
        <a
            href={listing.url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
            onClick={(e) => !listing.url && e.preventDefault()}
        >
            <div className="border border-gray-200/20 bg-[#e6e6e6] dark:bg-gray-800 rounded-[24px] p-3">
                {/* Image — white bg for transparent PNGs */}
                <div className="relative w-full aspect-square rounded-[24px] mb-2 overflow-hidden bg-white">
                    {listing.image_url && !imageError ? (
                        <Image
                            src={listing.image_url}
                            alt={`${listing.brand} ${listing.collection}`}
                            fill
                            unoptimized
                            className="object-contain p-2"
                            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 20vw"
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full bg-gray-200 dark:bg-gray-700">
                            <Watch className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                        </div>
                    )}

                    {/* Market price badge */}
                    <div className="absolute bottom-3 right-3">
                        <div className="bg-white rounded-full px-3 py-1.5 shadow-md">
                            <span className="text-[11px] font-semibold text-gray-900 whitespace-nowrap">
                                {formatPrice(listing.market_price_amount, listing.market_price_currency)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Text */}
                <div className="flex flex-col px-1 text-center">
                    <h3 className="text-[16px] font-bold text-gray-900 dark:text-white leading-tight line-clamp-1">
                        {listing.brand}
                    </h3>
                    <p className="text-[13px] font-medium text-gray-700 dark:text-gray-300 mt-0.5 line-clamp-1">
                        {listing.collection}
                    </p>
                    <p className="text-[11px] font-light text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">
                        {listing.reference}
                    </p>
                    {listing.retail_price && (
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 line-through">
                            {listing.retail_price}
                        </p>
                    )}
                </div>
            </div>
        </a>
    );
});

WatchItem.displayName = "WatchItem";
