import Image from "next/image";
import { ExternalLink, Store, CheckCircle2, XCircle, Package } from "lucide-react";
import { Card } from "@/components/ui/card";
import { memo } from "react";

interface ArtistProfile {
    name: string;
    url: string;
    artwork_count?: number;
}

interface Artwork {
    title: string;
    price: string;
    url: string;
    image_url?: string;
}

interface MarketplaceData {
    found: boolean;
    marketplace: string;
    artist_profile?: ArtistProfile | null;
    artworks?: Artwork[];
    total_artworks?: number;
    error_message?: string | null;
    search_metadata?: Record<string, unknown>;
}

interface MarketplaceCardProps {
    data: MarketplaceData;
}

/**
 * MarketplaceCard - Premium component for displaying marketplace search results
 *
 * Features:
 * - Artist profile section with marketplace branding
 * - Responsive artwork grid with hover effects
 * - Glassmorphism and gradient styling
 * - Dark mode support
 * - Error handling and empty states
 */
export const MarketplaceCard = memo(({ data }: MarketplaceCardProps) => {
    const { found, marketplace, artist_profile, artworks = [], total_artworks = 0, error_message } = data;

    // Marketplace branding colors
    const getMarketplaceStyle = (marketplace: string) => {
        const marketplaceLower = marketplace.toLowerCase();

        if (marketplaceLower.includes('saatchi')) {
            return {
                gradient: "from-blue-50/80 via-indigo-100/60 to-blue-50/80 dark:from-blue-900/20 dark:via-indigo-800/15 dark:to-blue-900/20",
                border: "border-blue-300/50 dark:border-blue-700/30",
                text: "text-blue-900 dark:text-blue-100",
                icon: "text-blue-600 dark:text-blue-300",
                badge: "bg-blue-100/80 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 border-blue-300/50 dark:border-blue-700/30"
            };
        } else if (marketplaceLower.includes('artsy')) {
            return {
                gradient: "from-purple-50/80 via-violet-100/60 to-purple-50/80 dark:from-purple-900/20 dark:via-violet-800/15 dark:to-purple-900/20",
                border: "border-purple-300/50 dark:border-purple-700/30",
                text: "text-purple-900 dark:text-purple-100",
                icon: "text-purple-600 dark:text-purple-300",
                badge: "bg-purple-100/80 dark:bg-purple-950/40 text-purple-800 dark:text-purple-200 border-purple-300/50 dark:border-purple-700/30"
            };
        } else {
            // Default/generic marketplace
            return {
                gradient: "from-gray-50/80 via-slate-100/60 to-gray-50/80 dark:from-gray-900/20 dark:via-slate-800/15 dark:to-gray-900/20",
                border: "border-gray-300/50 dark:border-gray-700/30",
                text: "text-gray-900 dark:text-gray-100",
                icon: "text-gray-600 dark:text-gray-300",
                badge: "bg-gray-100/80 dark:bg-gray-950/40 text-gray-800 dark:text-gray-200 border-gray-300/50 dark:border-gray-700/30"
            };
        }
    };

    const style = getMarketplaceStyle(marketplace);

    // Error state
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
                                Artist Not Found on {marketplace}
                            </h3>
                            {error_message && (
                                <p className="text-sm text-red-700 dark:text-red-300">
                                    {error_message}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Marketplace Header */}
            <Card className={`overflow-hidden border ${style.border} bg-gradient-to-r ${style.gradient} backdrop-blur-sm`}>
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        {/* Success Icon */}
                        <div className={`p-3 rounded-full bg-gradient-to-br ${style.gradient} border ${style.border}`}>
                            <CheckCircle2 className={`w-6 h-6 ${style.icon}`} />
                        </div>

                        {/* Artist Profile Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                                <Store className={`w-5 h-5 ${style.icon}`} />
                                <span className={`text-sm font-semibold uppercase tracking-wide ${style.text} opacity-80`}>
                                    {marketplace}
                                </span>
                            </div>

                            {artist_profile && (
                                <>
                                    <a
                                        href={artist_profile.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`text-2xl font-bold ${style.text} hover:underline inline-flex items-center gap-2 group mb-2`}
                                    >
                                        {artist_profile.name}
                                        <ExternalLink className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </a>

                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {artist_profile.artwork_count !== undefined && (
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${style.badge}`}>
                                                <Package className="w-3.5 h-3.5" />
                                                {artist_profile.artwork_count} artworks in profile
                                            </span>
                                        )}
                                        {total_artworks > 0 && (
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${style.badge}`}>
                                                {total_artworks} available {total_artworks === 1 ? 'artwork' : 'artworks'}
                                            </span>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </Card>

            {/* Artworks Grid */}
            {artworks.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {artworks.map((artwork, index) => (
                        <a
                            key={index}
                            href={artwork.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group"
                        >
                            <Card className="overflow-hidden border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                                {/* Artwork Image */}
                                {artwork.image_url && (
                                    <div className="relative w-full aspect-square bg-gray-100 dark:bg-gray-900 overflow-hidden">
                                        <Image
                                            src={artwork.image_url}
                                            alt={artwork.title}
                                            fill
                                            className="object-cover group-hover:scale-110 transition-transform duration-500"
                                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                        />
                                        {/* Overlay on hover */}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                                            <ExternalLink className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                        </div>
                                    </div>
                                )}

                                {/* Artwork Info */}
                                <div className="p-4">
                                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        {artwork.title}
                                    </h4>
                                    <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                                        {artwork.price}
                                    </p>
                                </div>
                            </Card>
                        </a>
                    ))}
                </div>
            )}

            {/* No artworks available message */}
            {found && artworks.length === 0 && (
                <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <div className="p-6 text-center">
                        <Package className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-600 dark:text-gray-400">
                            Artist found, but no artworks are currently available.
                        </p>
                    </div>
                </Card>
            )}
        </div>
    );
});

MarketplaceCard.displayName = "MarketplaceCard";
