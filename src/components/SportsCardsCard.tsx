"use client";

import Image from "next/image";
import { TrendingUp } from "lucide-react";
import { memo, useState } from "react";
import { useI18n } from "@/contexts/i18n-context";

interface CardListing {
    url: string;
    year: string | number | null;
    grade: string | null;
    price: string | null;
    title: string;
    grader: string | null;
    player: string | null;
    set_name: string | null;
    image_url: string | null;
    sale_date: string | null;
    marketplace: string;
    price_amount: number | null;
    price_currency: string | null;
}

export interface CardsSearchData {
    type: "cards_search_response";
    query: string;
    total_listings: number;
    listings: CardListing[];
    scraped_with?: string;
    error_message: string | null;
    title?: string;
    subtitle?: string;
}

interface SportsCardsCardProps {
    data: CardsSearchData;
}

const formatPrice = (amount: number | null, currency: string | null): string => {
    if (amount === null || amount === undefined) return "N/A";
    const fmt =
        amount >= 10000
            ? `${(amount / 1000).toFixed(0)}K`
            : amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    return currency ? `${fmt} ${currency}` : fmt;
};

/**
 * 130point wraps source images through their own Next.js image optimizer:
 * https://130point.com/_next/image?url=<encoded-source>&w=3840&q=75
 * Unwrap it to get the original source URL so our own Next.js <Image>
 * doesn't try to double-proxy an already-proxied URL (which fails due to
 * 130point's referrer/CORS restrictions).
 */
const resolveImageUrl = (url: string): string => {
    try {
        const parsed = new URL(url);
        if (parsed.hostname === "130point.com" && parsed.pathname === "/_next/image") {
            const inner = parsed.searchParams.get("url");
            if (inner) return decodeURIComponent(inner);
        }
    } catch {
        // not a valid URL — return as-is
    }
    return url;
};

/**
 * The backend embeds price + bid info at the end of the title string:
 * e.g. "MICHAEL JORDAN BGS 9.5 1986-87 FLEER #57 ROOKIE CARD RC$35,423.23USD65 bids ·7d"
 * Strip everything from the first "$" onward to get a clean card name.
 */
const cleanTitle = (raw: string): string => {
    const dollarIdx = raw.indexOf("$");
    return (dollarIdx > 0 ? raw.slice(0, dollarIdx) : raw).trim();
};

export const SportsCardsCard = memo(({ data }: SportsCardsCardProps) => {
    const { t } = useI18n();
    const { listings } = data;
    const title = data.title || t("cards.investmentAvailability");
    const subtitle = data.subtitle || t("cards.technicalNote");

    // Deduplicate by listing url (unique per item even when images are shared)
    const seen = new Set<string>();
    const validListings = listings.filter((l) => {
        if (!l.image_url) return false;
        if (!l.url || seen.has(l.url)) return false;
        seen.add(l.url);
        return true;
    });
    const displayedListings = validListings.slice(0, 4);

    if (displayedListings.length === 0) return null;

    return (
        <div>
            <div className="mb-3">
                <h2 className="text-[16px] font-bold text-gray-900 dark:text-white">{title}</h2>
                <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-1 italic">{subtitle}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {displayedListings.map((listing, index) => (
                    <CardItem key={`card-${index}`} listing={listing} />
                ))}
            </div>
        </div>
    );
});

SportsCardsCard.displayName = "SportsCardsCard";

const CardItem = memo(({ listing }: { listing: CardListing }) => {
    const [imageError, setImageError] = useState(false);

    const resolvedImage = listing.image_url ? resolveImageUrl(listing.image_url) : null;

    // Prefer explicit player/set_name fields; fall back to parsing title
    const cardName = listing.player || cleanTitle(listing.title) || "Card";
    const yearStr = listing.year ? String(listing.year) : null;
    // grade field already contains the full grade string e.g. "BGS 9.5" or "PSA 10"
    const gradeStr = listing.grade || null;
    const yearAndGrade = [yearStr, gradeStr].filter(Boolean).join(" · ");

    return (
        <a
            href={listing.url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
            onClick={(e) => !listing.url && e.preventDefault()}
        >
            <div className="border border-gray-200/20 bg-[#e6e6e6] dark:bg-gray-800 rounded-[24px] p-3">
                {/* Card image */}
                <div className="relative w-full aspect-square rounded-[24px] mb-2 overflow-hidden bg-white">
                    {resolvedImage && !imageError ? (
                        <Image
                            src={resolvedImage}
                            alt={cardName}
                            fill
                            unoptimized
                            className="object-contain p-2"
                            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 20vw"
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full bg-gray-200 dark:bg-gray-700">
                            <TrendingUp className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                        </div>
                    )}

                    {/* Price badge */}
                    <div className="absolute bottom-3 right-3">
                        <div className="bg-white rounded-full px-3 py-1.5 shadow-md">
                            <span className="text-[11px] font-semibold text-gray-900 whitespace-nowrap">
                                {formatPrice(listing.price_amount, listing.price_currency)}
                            </span>
                        </div>
                    </div>

                    {/* Grade badge (top-left) */}
                    {gradeStr && (
                        <div className="absolute top-3 left-3">
                            <div className="bg-black/70 rounded-full px-2 py-1">
                                <span className="text-[10px] font-bold text-white whitespace-nowrap">
                                    {gradeStr}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Text */}
                <div className="flex flex-col px-1 text-center">
                    <h3 className="text-[13px] font-bold text-gray-900 dark:text-white leading-tight line-clamp-2">
                        {cardName}
                    </h3>
                    {yearAndGrade && (
                        <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                            {yearAndGrade}
                        </p>
                    )}
                    {listing.set_name && (
                        <p className="text-[11px] font-light text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">
                            {listing.set_name}
                        </p>
                    )}
                </div>
            </div>
        </a>
    );
});

CardItem.displayName = "CardItem";
