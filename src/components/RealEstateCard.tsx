import Image from "next/image";
import { ExternalLink, MapPin, Bed, Bath, Maximize, Home, XCircle } from "lucide-react";
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
    listing_id?: string;
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
 */
const formatPrice = (amount: number, currency: string): string => {
    if (amount >= 1000000) {
        const millions = amount / 1000000;
        const formatted = millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1);
        return `${currency} ${formatted}M`;
    } else if (amount >= 1000) {
        const thousands = amount / 1000;
        const formatted = thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(0);
        return `${currency} ${formatted}K`;
    }
    return `${currency} ${amount.toLocaleString()}`;
};

/**
 * RealEstateCard - Bold modern luxury real estate component
 */
export const RealEstateCard = memo(({ data }: RealEstateCardProps) => {
    const { found, marketplace, location, properties = [], error_message } = data;

    // Marketplace-specific accent colors
    const getAccentColor = (name: string): string => {
        if (name.toLowerCase().includes('james')) return 'bg-amber-500';
        return 'bg-blue-600';
    };

    const accentClass = getAccentColor(marketplace);

    if (!found || error_message) {
        return (
            <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
                <div className="p-8 flex items-start gap-4">
                    <XCircle className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0 mt-1" />
                    <div>
                        <h3 className="text-xl font-semibold text-red-900 dark:text-red-100 mb-2">
                            No Properties Found
                        </h3>
                        <p className="text-red-700 dark:text-red-300">
                            {error_message || `No listings available in ${location} on ${marketplace}.`}
                        </p>
                    </div>
                </div>
            </Card>
        );
    }

    // Limit to 4 properties
    const displayedProperties = properties.slice(0, 4);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-end justify-between border-b-2 border-gray-900 dark:border-white pb-6">
                <div>
                    <h2
                        className="text-4xl md:text-5xl font-normal text-gray-900 dark:text-white"
                        style={{ fontFamily: "'Spectral', serif" }}
                    >
                        {location}
                    </h2>
                </div>
            </div>

            {/* Properties Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {displayedProperties.map((property, index) => (
                    <a
                        key={index}
                        href={property.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block"
                    >
                        <Card className="h-full overflow-hidden border-2 border-gray-200 dark:border-gray-800 hover:border-gray-900 dark:hover:border-white transition-all duration-300 hover:shadow-2xl">
                            {/* Image */}
                            <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-900">
                                {property.image_url ? (
                                    <>
                                        <Image
                                            src={property.image_url}
                                            alt={property.title}
                                            fill
                                            className="object-cover group-hover:scale-110 transition-transform duration-700"
                                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                        />
                                        {/* Dark overlay on hover */}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                                    </>
                                ) : (
                                    <div className="flex items-center justify-center h-full">
                                        <Home className="w-16 h-16 text-gray-300 dark:text-gray-700" />
                                    </div>
                                )}

                                {/* Price overlay */}
                                <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4">
                                    <div className="text-2xl font-bold text-white">
                                        {formatPrice(property.price_amount, property.price_currency)}
                                    </div>
                                </div>

                                {/* External link indicator */}
                                <div className="absolute bottom-4 right-4 bg-white dark:bg-gray-900 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <ExternalLink className="w-5 h-5 text-gray-900 dark:text-white" />
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                {/* Title */}
                                <h3
                                    className="text-xl font-normal text-gray-900 dark:text-white mb-3 line-clamp-2 min-h-[3.5rem]"
                                    style={{ fontFamily: "'Spectral', serif" }}
                                >
                                    {property.title}
                                </h3>

                                {/* Location */}
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-4">
                                    <MapPin className="w-4 h-4" />
                                    <span className="text-sm font-medium">{location}</span>
                                </div>

                                {/* Specs */}
                                <div className="grid grid-cols-3 gap-4 pt-4 border-t-2 border-gray-100 dark:border-gray-800">
                                    {property.bedrooms !== undefined && (
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Bed className="w-4 h-4 text-gray-400" />
                                                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                                    {property.bedrooms}
                                                </span>
                                            </div>
                                            <div className="text-xs font-semibold text-gray-500 uppercase">Beds</div>
                                        </div>
                                    )}

                                    {property.bathrooms !== undefined && (
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Bath className="w-4 h-4 text-gray-400" />
                                                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                                    {property.bathrooms}
                                                </span>
                                            </div>
                                            <div className="text-xs font-semibold text-gray-500 uppercase">Baths</div>
                                        </div>
                                    )}

                                    {(property.square_meters || property.square_feet) && (
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Maximize className="w-4 h-4 text-gray-400" />
                                                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                                    {(property.square_meters || property.square_feet || 0) > 999
                                                        ? `${Math.round((property.square_meters || property.square_feet || 0) / 1000)}k`
                                                        : property.square_meters || property.square_feet}
                                                </span>
                                            </div>
                                            <div className="text-xs font-semibold text-gray-500 uppercase">
                                                {property.square_meters ? 'm²' : 'ft²'}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Property type badge */}
                                {property.property_type && (
                                    <div className="mt-4 pt-4 border-t-2 border-gray-100 dark:border-gray-800">
                                        <span className="inline-block px-3 py-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-bold uppercase tracking-wider">
                                            {property.property_type}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </a>
                ))}
            </div>

            <style jsx>{`
                @import url('https://fonts.googleapis.com/css2?family=Spectral:wght@400&display=swap');
            `}</style>
        </div>
    );
});

RealEstateCard.displayName = "RealEstateCard";
