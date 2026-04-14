"use client";

import Image from "next/image";
import { Gem } from "lucide-react";
import { memo, useState } from "react";
import { useI18n } from "@/contexts/i18n-context";

interface JewelryListing {
    brand: string;
    description: string;
    price: number | null;
    currency: string | null;
    url: string;
    image_url: string | null;
    condition: string | null;
}

export interface JewelrySearchData {
    type: "jewelry_search_response";
    query: string;
    total_listings: number;
    listings: JewelryListing[];
    error_message: string | null;
    title?: string;
    subtitle?: string;
}

interface JewelryCardProps {
    data: JewelrySearchData;
}

const formatPrice = (price: number | null): string => {
    if (price === null || price === undefined) return "N/A";
    if (price >= 10000) {
        return `${(price / 1000).toFixed(0)}K`;
    }
    return price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

export const JewelryCard = memo(({ data }: JewelryCardProps) => {
    const { t } = useI18n();
    const { listings } = data;
    const title = data.title || t("cards.investmentAvailability");
    const subtitle = data.subtitle || t("cards.technicalNote");

    const validListings = listings.filter((listing) => listing.image_url);
    const displayedListings = validListings.slice(0, 4);

    if (displayedListings.length === 0) {
        return null;
    }

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
                    <JewelryItem key={`jewelry-${index}`} listing={listing} />
                ))}
            </div>
        </div>
    );
});

JewelryCard.displayName = "JewelryCard";

const JewelryItem = memo(({ listing }: { listing: JewelryListing }) => {
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
                {/* Image */}
                <div className="relative w-full aspect-square rounded-[24px] mb-2 overflow-hidden">
                    {listing.image_url && !imageError ? (
                        <Image
                            src={listing.image_url}
                            alt={listing.description || "Luxury jewelry"}
                            fill
                            unoptimized
                            className="object-cover"
                            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 20vw"
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full bg-gray-200 dark:bg-gray-700">
                            <Gem className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                        </div>
                    )}

                    {/* Price badge */}
                    <div className="absolute bottom-3 right-3">
                        <div className="bg-white rounded-full px-3 py-1.5 shadow-md">
                            <span className="text-sm font-semibold text-gray-900">
                                {formatPrice(listing.price)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Text */}
                <div className="flex flex-col px-1 text-center">
                    <h3 className="text-[16px] font-bold text-gray-900 dark:text-white leading-tight line-clamp-2">
                        {listing.brand || listing.description || "Luxury Jewelry"}
                    </h3>
                    <p className="text-[14px] font-light italic text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                        {listing.description}
                    </p>
                </div>
            </div>
        </a>
    );
});

JewelryItem.displayName = "JewelryItem";
