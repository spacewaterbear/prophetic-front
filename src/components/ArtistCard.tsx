import Image from "next/image";
import { MapPin, Image as ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Markdown } from "@/components/Markdown";
import { MetricBadge } from "@/components/MetricBadge";

interface Artist {
    artist_name: string;
    artist_picture_url: string | null;
    primary_country: string | null;
    country_iso_code: string | null;
    total_artworks: number | null;
    ratio_sold?: number; // Float between 0 and 1
    social_score?: number; // Float between 0 and 1
}

interface ArtistCardProps {
    artist: Artist;
    message?: string;
    researchType?: string;
    text?: string;
    streamingText?: string;
    hasExistingData?: boolean;
}

export function ArtistCard({ artist, message, researchType, text, streamingText, hasExistingData }: ArtistCardProps) {
    return (
        <div className="space-y-4">
            {/* Artist Info Card */}
            <Card className="overflow-hidden border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="grid md:grid-cols-[200px_1fr] gap-6 p-6">
                    {/* Artist Image - Fixed height container */}
                    <div className="relative w-full aspect-square md:h-[200px] rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900">
                        {artist.artist_picture_url ? (
                            <Image
                                src={artist.artist_picture_url}
                                alt={artist.artist_name}
                                fill
                                className="object-cover"
                                sizes="200px"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
                                <span className="text-6xl font-bold text-gray-300 dark:text-gray-700 select-none">
                                    {artist.artist_name.charAt(0).toUpperCase()}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Artist Details - Constrained to image height */}
                    <div className="flex flex-col justify-between md:h-[200px] space-y-4">
                        {/* Name and Research Type */}
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1 line-clamp-2">
                                {artist.artist_name}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2">
                                {researchType && (
                                    <span className="inline-block px-3 py-1 text-xs font-semibold tracking-wide bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full">
                                        {researchType.replace(/_/g, " ").toUpperCase()}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Stats Grid - Only show if at least one field has data */}
                        {(artist.country_iso_code || artist.total_artworks !== null) && (
                            <div className="flex flex-wrap gap-4">
                                {/* Country - Only show if not null */}
                                {artist.country_iso_code && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <div className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
                                            <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">Country</p>
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {artist.country_iso_code}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Artworks - Only show if not null */}
                                {artist.total_artworks !== null && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <div className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
                                            <ImageIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">Artworks</p>
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {artist.total_artworks.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Metric Badges - Luxury badge design */}
                        <div className="flex flex-wrap gap-2 w-full mt-auto">
                            <MetricBadge
                                ratio={artist.ratio_sold ?? 0.33}
                                type="sell"
                                className="flex-1 min-w-[140px]"
                            />
                            <MetricBadge
                                ratio={artist.social_score ?? 0.50}
                                type="social"
                                className="flex-1 min-w-[140px]"
                            />
                        </div>
                    </div>
                </div>
            </Card>

            {/* Streaming Text - shown when has_existing_data is true */}
            {hasExistingData && streamingText && (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                    <Markdown content={streamingText} className="text-base" />
                </div>
            )}

            {/* Analysis Text */}
            {text && (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                    <Markdown content={text} className="text-base" />
                </div>
            )}
        </div>
    );
}
