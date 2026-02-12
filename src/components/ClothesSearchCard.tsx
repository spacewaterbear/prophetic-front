import Image from "next/image";
import { ShoppingBag } from "lucide-react";
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
    title?: string;
    subtitle?: string;
}

interface ClothesSearchCardProps {
    data: ClothesSearchData;
}

// Format price without currency
const formatPrice = (price: number | null): string => {
    if (price === null || price === undefined) return "N/A";

    if (price >= 10000) {
        return `${(price / 1000).toFixed(0)}K`;
    }
    return price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

/**
 * ClothesSearchCard - VignetteGridCard-inspired design
 */
export const ClothesSearchCard = memo(({ data }: ClothesSearchCardProps) => {
    const { listings, title, subtitle } = data;

    // Filter valid listings (must have image)
    const validListings = listings.filter(listing => listing.image_url);

    // Limit to 4 items
    const displayedListings = validListings.slice(0, 4);

    if (displayedListings.length === 0) {
        return null;
    }

    return (
        <div>
            {title && (
                <div className="mb-3">
                    <h2 className="text-[16px] font-bold text-gray-900 dark:text-white">
                        {title}
                    </h2>
                    {subtitle && (
                        <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-1 italic">
                            {subtitle}
                        </p>
                    )}
                </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {displayedListings.map((listing, index) => (
                    <ProductCard key={`${listing.marketplace}-${index}`} listing={listing} />
                ))}
            </div>
        </div>
    );
});

ClothesSearchCard.displayName = "ClothesSearchCard";

const ProductCard = memo(({ listing }: { listing: ClothesListing }) => {
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
                            alt={listing.description || "Luxury item"}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 20vw"
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full bg-gray-200 dark:bg-gray-700">
                            <ShoppingBag className="w-12 h-12 text-gray-400 dark:text-gray-500" />
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
                        {listing.brand || listing.description || "Luxury Item"}
                    </h3>
                    <p className="text-[14px] font-light italic text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                        {listing.description}
                    </p>
                </div>
            </div>
        </a>
    );
});

ProductCard.displayName = "ProductCard";
