"use client";

import Image from "next/image";
import { Car } from "lucide-react";
import { memo, useState } from "react";
import { useI18n } from "@/contexts/i18n-context";

interface CarListing {
    brand: string;
    description: string;
    estimate_low: number | null;
    estimate_high: number | null;
    currency: string | null;
    url: string;
    image_url: string | null;
    status: string | null;
}

export interface CarsSearchData {
    type: "car_search_response";
    query: string;
    total_listings: number;
    listings: CarListing[];
    error_message: string | null;
    title?: string;
    subtitle?: string;
}

interface CarsCardProps {
    data: CarsSearchData;
}

const formatEstimate = (low: number | null, high: number | null, currency: string | null): string => {
    const fmt = (n: number) => {
        if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
        if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
        return n.toLocaleString("en-US");
    };
    const curr = currency ?? "";
    if (low !== null && high !== null) return `${fmt(low)} – ${fmt(high)} ${curr}`.trim();
    if (low !== null) return `${fmt(low)} ${curr}`.trim();
    if (high !== null) return `${fmt(high)} ${curr}`.trim();
    return "N/A";
};

export const CarsCard = memo(({ data }: CarsCardProps) => {
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
                    <CarItem key={`car-${index}`} listing={listing} />
                ))}
            </div>
        </div>
    );
});

CarsCard.displayName = "CarsCard";

const CarItem = memo(({ listing }: { listing: CarListing }) => {
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
                <div className="relative w-full aspect-square rounded-[24px] mb-2 overflow-hidden">
                    {listing.image_url && !imageError ? (
                        <Image
                            src={listing.image_url}
                            alt={listing.description || "Luxury car"}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 20vw"
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full bg-gray-200 dark:bg-gray-700">
                            <Car className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                        </div>
                    )}

                    <div className="absolute bottom-3 right-3">
                        <div className="bg-white rounded-full px-3 py-1.5 shadow-md">
                            <span className="text-[11px] font-semibold text-gray-900 whitespace-nowrap">
                                {formatEstimate(listing.estimate_low, listing.estimate_high, listing.currency)}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col px-1 text-center">
                    <h3 className="text-[16px] font-bold text-gray-900 dark:text-white leading-tight line-clamp-2">
                        {listing.brand || listing.description || "Luxury Car"}
                    </h3>
                    <p className="text-[14px] font-light italic text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                        {listing.description}
                    </p>
                </div>
            </div>
        </a>
    );
});

CarItem.displayName = "CarItem";
