import Image from "next/image";
import { Home, XCircle } from "lucide-react";
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
    title?: string;
    subtitle?: string;
}

interface RealEstateCardProps {
    data: RealEstateData;
}

/**
 * Format price to display in K (thousands) or M (millions)
 */
const formatPrice = (amount: number): string => {
    if (amount >= 1000000) {
        const millions = amount / 1000000;
        const formatted = millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1);
        return `${formatted}M`;
    } else if (amount >= 1000) {
        const thousands = amount / 1000;
        const formatted = thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(0);
        return `${formatted}K`;
    }
    return amount.toLocaleString();
};

/**
 * RealEstateCard - Bold modern luxury real estate component
 */
export const RealEstateCard = memo(({ data }: RealEstateCardProps) => {
    const { found, marketplace, location, properties = [], error_message } = data;
    const title = data.title || "Disponibilité à l'investissement";
    const subtitle = data.subtitle || "Note technique : Des écarts marginaux peuvent subsister entre l'affichage temps réel et la disponibilité notifiée dans l'Insight. Nos équipes travaillent actuellement à l'optimisation de la synchronisation pour une précision absolue";

    if (!found || error_message) {
        return null;
    }

    // Limit to 4 properties
    const displayedProperties = properties.slice(0, 4);

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
            {displayedProperties.map((property, index) => (
                <a
                    key={index}
                    href={property.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                >
                    <div className="border border-gray-200/20 bg-[#e6e6e6] dark:bg-gray-800 rounded-[24px] p-3">
                        {/* Image */}
                        <div className="relative w-full aspect-square rounded-[24px] mb-2 overflow-hidden">
                            {property.image_url ? (
                                <Image
                                    src={property.image_url}
                                    alt={property.title}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 20vw"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full bg-gray-200 dark:bg-gray-700">
                                    <Home className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                                </div>
                            )}

                            {/* Price badge */}
                            <div className="absolute bottom-3 right-3">
                                <div className="bg-white rounded-full px-3 py-1.5 shadow-md">
                                    <span className="text-sm font-semibold text-gray-900">
                                        {formatPrice(property.price_amount)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Text */}
                        <div className="flex flex-col px-1 text-center">
                            <h3 className="text-[16px] font-bold text-gray-900 dark:text-white leading-tight line-clamp-2">
                                {property.title}
                            </h3>
                            <p className="text-[14px] font-light italic text-gray-500 dark:text-gray-400 mt-0.5">
                                {location}
                            </p>
                        </div>
                    </div>
                </a>
            ))}
        </div>
        </div>
    );
});

RealEstateCard.displayName = "RealEstateCard";
