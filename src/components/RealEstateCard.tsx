import Image from "next/image";
import { ExternalLink, MapPin, Bed, Bath, Maximize, Home, Building2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { memo } from "react";

// Interfaces based on the user provided JSON structure
export interface RealEstateProperty {
    title: string;
    price: string;
    price_amount: number;
    price_currency: string;
    url: string;
    image_url: string;
    bedrooms?: number;
    bathrooms?: number;
    square_meters?: number;
    square_feet?: number;
    property_type: string;
    listing_id?: string; // Internal use, maybe not displayed
}

export interface RealEstateData {
    found: boolean;
    marketplace: string;
    location: string;
    location_slug?: string;
    properties: RealEstateProperty[];
    total_properties: number;
    search_url?: string;
    filters_applied?: Record<string, unknown>;
    error_message?: string | null;
}

interface RealEstateCardProps {
    data: RealEstateData;
}

/**
 * Format price to display in K (thousands) or M (millions)
 * @param amount - The price amount
 * @param currency - The currency code (e.g., "USD")
 * @returns Formatted price string (e.g., "USD 780K", "USD 50M")
 */
const formatPrice = (amount: number, currency: string): string => {
    if (amount >= 1000000) {
        const millions = amount / 1000000;
        // Remove unnecessary decimals (e.g., 50.00M -> 50M, but 49.99M stays)
        const formatted = millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(2).replace(/\.?0+$/, '');
        return `${currency} ${formatted}M`;
    } else if (amount >= 1000) {
        const thousands = amount / 1000;
        const formatted = thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(2).replace(/\.?0+$/, '');
        return `${currency} ${formatted}K`;
    }
    return `${currency} ${amount}`;
};

/**
 * RealEstateCard - Premium component for displaying real estate search results
 * 
 * Features:
 * - Displays a grid of properties (2 rows of 3 for 6 items)
 * - Premium styling with glassmorphism and gradients
 * - Responsive design
 */
export const RealEstateCard = memo(({ data }: RealEstateCardProps) => {
    const { found, marketplace, location, properties = [], error_message } = data;

    // Marketplace branding colors (extensible)
    const getMarketplaceStyle = (marketplaceName: string) => {
        const name = marketplaceName.toLowerCase();
        if (name.includes('james')) {
            // James Edition style (Black/White/Gold feel)
            return {
                gradient: "from-neutral-50 via-stone-100 to-neutral-50 dark:from-neutral-900 dark:via-stone-900 dark:to-neutral-900",
                border: "border-stone-200 dark:border-stone-800",
                text: "text-stone-900 dark:text-stone-100",
                accent: "text-amber-600 dark:text-amber-500",
                badge: "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
            };
        }
        // Default style
        return {
            gradient: "from-slate-50 via-gray-100 to-slate-50 dark:from-slate-900 dark:via-gray-900 dark:to-slate-900",
            border: "border-slate-200 dark:border-slate-800",
            text: "text-slate-900 dark:text-slate-100",
            accent: "text-blue-600 dark:text-blue-400",
            badge: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
        };
    };

    const style = getMarketplaceStyle(marketplace);

    if (!found || error_message) {
        return (
            <Card className="overflow-hidden border-red-200 dark:border-red-700/30 bg-gradient-to-r from-red-50/80 to-red-100/60 dark:from-red-900/20 dark:to-red-800/15">
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 rounded-full bg-red-100 dark:bg-red-950/40">
                            <XCircle className="w-6 h-6 text-red-600 dark:text-red-300" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
                                No Properties Found
                            </h3>
                            <p className="text-sm text-red-700 dark:text-red-300">
                                {error_message || `We couldn't find any properties in ${location} on ${marketplace}.`}
                            </p>
                        </div>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className={`rounded-xl border ${style.border} bg-gradient-to-r ${style.gradient} p-6 shadow-sm`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Building2 className={`w-5 h-5 ${style.accent}`} />
                            <span className={`text-sm font-medium uppercase tracking-wider ${style.text} opacity-70`}>
                                {marketplace}
                            </span>
                        </div>
                        <h2 className={`text-2xl md:text-3xl font-bold ${style.text}`}>
                            Real Estate in {location}
                        </h2>
                    </div>
                    <div className={`px-4 py-2 rounded-full border ${style.border} bg-white/50 dark:bg-black/20 backdrop-blur-sm`}>
                        <span className={`font-semibold ${style.text}`}>
                            {properties.length} Listings Found
                        </span>
                    </div>
                </div>
            </div>

            {/* Properties Grid */}
            <div className={`grid gap-6 ${properties.length === 1 ? 'grid-cols-1' :
                properties.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
                    'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                }`}>
                {properties.map((property, index) => (
                    <a
                        key={index}
                        href={property.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block h-full"
                    >
                        <Card className="h-full overflow-hidden border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
                            {/* Image Container */}
                            <div className="relative w-full aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-800">
                                {property.image_url ? (
                                    <Image
                                        src={property.image_url}
                                        alt={property.title}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-400">
                                        <Home className="w-12 h-12" />
                                    </div>
                                )}

                                {/* Price Tag Overlay */}
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-12">
                                    <p className="text-xl font-bold text-white">
                                        {formatPrice(property.price_amount, property.price_currency)}
                                    </p>
                                </div>

                                {/* External Link Overlay */}
                                <div className="absolute top-4 right-4 bg-white/90 dark:bg-black/90 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg">
                                    <ExternalLink className="w-4 h-4 text-gray-900 dark:text-white" />
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-5 flex flex-col flex-1">
                                <div className="mb-4 flex-1">
                                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white line-clamp-2 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        {property.title}
                                    </h3>
                                    <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                                        <MapPin className="w-3 h-3" />
                                        <span>{location}</span>
                                    </div>
                                </div>

                                {/* Specs Grid */}
                                <div className="grid grid-cols-3 gap-2 py-3 border-t border-gray-100 dark:border-gray-800">
                                    {property.bedrooms !== undefined && (
                                        <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                            <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 mb-0.5">
                                                <Bed className="w-4 h-4" />
                                                <span className="font-bold">{property.bedrooms}</span>
                                            </div>
                                            <span className="text-[10px] uppercase tracking-wider text-gray-500">Beds</span>
                                        </div>
                                    )}

                                    {property.bathrooms !== undefined && (
                                        <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                            <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 mb-0.5">
                                                <Bath className="w-4 h-4" />
                                                <span className="font-bold">{property.bathrooms}</span>
                                            </div>
                                            <span className="text-[10px] uppercase tracking-wider text-gray-500">Baths</span>
                                        </div>
                                    )}

                                    {(property.square_meters || property.square_feet) && (
                                        <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                            <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 mb-0.5">
                                                <Maximize className="w-4 h-4" />
                                                <span className="font-bold">
                                                    {property.square_meters || property.square_feet}
                                                </span>
                                            </div>
                                            <span className="text-[10px] uppercase tracking-wider text-gray-500">
                                                {property.square_meters ? 'm²' : 'sq ft'}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Property Type Badge */}
                                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                                    {property.property_type && (
                                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                            {property.property_type}
                                        </span>
                                    )}
                                    <span className={`text-xs text-blue-600 dark:text-blue-400 font-medium group-hover:underline ${!property.property_type ? 'ml-auto' : ''}`}>
                                        View Details
                                    </span>
                                </div>
                            </div>
                        </Card>
                    </a>
                ))}
            </div>
        </div>
    );
});

RealEstateCard.displayName = "RealEstateCard";
