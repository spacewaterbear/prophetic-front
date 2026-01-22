import Image from "next/image";
import { ExternalLink, Tag, ShoppingBag } from "lucide-react";
import { Card } from "@/components/ui/card";
import { memo, useState } from "react";

interface ClothesListing {
    marketplace: string;
    brand: string;
    description: string;
    price: number | null;
    currency: string | null;
    url: string;
    image_url: string | null;
    condition: string | null;
}

interface MarketplaceBreakdown {
    total_listings: number;
    success: boolean;
    error_message: string | null;
}

export interface ClothesSearchData {
    type: "clothes_search_response";
    query: string;
    total_listings: number;
    successful_marketplaces: number;
    failed_marketplaces: number;
    marketplace_breakdown: Record<string, MarketplaceBreakdown>;
    listings: ClothesListing[];
    error_message: string | null;
}

interface ClothesSearchCardProps {
    data: ClothesSearchData;
}

// Format price with currency symbol
const formatPrice = (price: number | null, currency: string | null): string => {
    if (price === null || price === undefined) return "Price on request";

    const currencySymbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : currency === "GBP" ? "£" : "";

    if (price >= 10000) {
        return `${currencySymbol}${(price / 1000).toFixed(0)}K`;
    }
    return `${currencySymbol}${price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

// Get marketplace display name
const getMarketplaceName = (marketplace: string): string => {
    const mp = marketplace.toLowerCase();
    if (mp.includes("farfetch")) return "Farfetch";
    if (mp.includes("vestiaire")) return "Vestiaire Collective";
    if (mp.includes("rebag")) return "Rebag";
    return marketplace;
};

// Individual product card - James Edition style
const ProductCard = memo(({ listing }: { listing: ClothesListing }) => {
    const [imageError, setImageError] = useState(false);

    // Skip items without image or price
    if (!listing.image_url && !listing.price) return null;

    return (
        <a
            href={listing.url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="group block"
            onClick={(e) => !listing.url && e.preventDefault()}
        >
            <Card className="h-full overflow-hidden border-2 border-gray-200 dark:border-gray-800 hover:border-gray-900 dark:hover:border-white transition-all duration-300 hover:shadow-2xl">
                {/* Image */}
                <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-900">
                    {listing.image_url && !imageError ? (
                        <>
                            <Image
                                src={listing.image_url}
                                alt={listing.description || "Luxury item"}
                                fill
                                className="object-cover group-hover:scale-110 transition-transform duration-700"
                                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                                onError={() => setImageError(true)}
                            />
                            {/* Dark overlay on hover */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <ShoppingBag className="w-16 h-16 text-gray-300 dark:text-gray-700" />
                        </div>
                    )}

                    {/* Price overlay */}
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4">
                        <span className="text-2xl font-bold text-white">
                            {formatPrice(listing.price, listing.currency)}
                        </span>
                    </div>

                    {/* External link indicator */}
                    {listing.url && (
                        <div className="absolute bottom-4 right-4 bg-white dark:bg-gray-900 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <ExternalLink className="w-5 h-5 text-gray-900 dark:text-white" />
                        </div>
                    )}

                    {/* Condition badge */}
                    {listing.condition && (
                        <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm px-2 py-1">
                            <span className="text-xs font-semibold text-gray-900 dark:text-white uppercase">
                                {listing.condition}
                            </span>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-5">
                    {/* Brand */}
                    {listing.brand && (
                        <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                            {listing.brand}
                        </div>
                    )}

                    {/* Description */}
                    <h3
                        className="text-lg font-normal text-gray-900 dark:text-white mb-4 line-clamp-2 min-h-[3rem]"
                        style={{ fontFamily: "'Spectral', serif" }}
                    >
                        {listing.description || "Luxury Item"}
                    </h3>

                    {/* Marketplace badge */}
                    <div className="pt-4 border-t-2 border-gray-100 dark:border-gray-800">
                        <span className="inline-block px-3 py-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-bold uppercase tracking-wider">
                            {getMarketplaceName(listing.marketplace)}
                        </span>
                    </div>
                </div>
            </Card>
        </a>
    );
});

ProductCard.displayName = "ProductCard";

/**
 * ClothesSearchCard - Luxury component matching James Edition style
 */
export const ClothesSearchCard = memo(({ data }: ClothesSearchCardProps) => {
    const [selectedMarketplace, setSelectedMarketplace] = useState<string | null>(null);

    const { listings, marketplace_breakdown, total_listings, successful_marketplaces } = data;

    // Filter valid listings (with price or image)
    const validListings = listings.filter(
        listing => listing.price || listing.image_url
    );

    // Get filtered listings based on selected marketplace
    const displayedListings = selectedMarketplace
        ? validListings.filter(l => l.marketplace === selectedMarketplace)
        : validListings;

    // Get marketplace options for filter
    const marketplaces = Object.keys(marketplace_breakdown).filter(
        mp => marketplace_breakdown[mp].success && marketplace_breakdown[mp].total_listings > 0
    );

    if (validListings.length === 0) {
        return (
            <Card className="border-2 border-gray-200 dark:border-gray-800">
                <div className="p-8 flex items-start gap-4">
                    <Tag className="w-6 h-6 text-gray-400 shrink-0 mt-1" />
                    <div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            No Items Found
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            We couldn&apos;t find any items matching your search. Try adjusting your search terms.
                        </p>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <div>
            {/* Header with marketplace filters */}
            {marketplaces.length > 1 && (
                <div className="flex flex-wrap items-center gap-3 mb-6">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {total_listings} items from {successful_marketplaces} marketplace{successful_marketplaces > 1 ? "s" : ""}
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setSelectedMarketplace(null)}
                            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                                selectedMarketplace === null
                                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                                    : "bg-transparent border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-900 dark:hover:border-white"
                            }`}
                        >
                            All
                        </button>
                        {marketplaces.map((mp) => {
                            const count = marketplace_breakdown[mp].total_listings;
                            return (
                                <button
                                    key={mp}
                                    onClick={() => setSelectedMarketplace(mp)}
                                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                                        selectedMarketplace === mp
                                            ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                                            : "bg-transparent border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-900 dark:hover:border-white"
                                    }`}
                                >
                                    {getMarketplaceName(mp)} ({count})
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Products Grid - 2 columns like James Edition */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {displayedListings.slice(0, 8).map((listing, index) => (
                    <ProductCard key={`${listing.marketplace}-${index}`} listing={listing} />
                ))}
            </div>

            {/* Show more indicator */}
            {displayedListings.length > 8 && (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6 pt-6 border-t-2 border-gray-100 dark:border-gray-800">
                    Showing 8 of {displayedListings.length} items
                </p>
            )}

            <style jsx>{`
                @import url('https://fonts.googleapis.com/css2?family=Spectral:wght@400&display=swap');
            `}</style>
        </div>
    );
});

ClothesSearchCard.displayName = "ClothesSearchCard";
