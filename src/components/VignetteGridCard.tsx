import Image from "next/image";
import { memo } from "react";
import { VignetteData } from "@/types/vignettes";

interface VignetteGridCardProps {
    data: VignetteData[];
    onVignetteClick?: (vignette: VignetteData) => void;
}

/**
 * VignetteGridCard - Display vignettes in a premium grid format
 *
 * Formalism requirements:
 * - Title: Inter size 16 bold (centered) - brand_name
 * - Subtitle: Inter size 14 Light Italic (centered) - subtitle
 * - Specific visual style: rounded-[24px], bg-[#e6e6e6]
 */
export const VignetteGridCard = memo(({ data, onVignetteClick }: VignetteGridCardProps) => {
    if (!data || data.length === 0) {
        return null;
    }

    return (
        <div className="w-full">
            {/* Vignette Grid - 2x2 on all screen sizes */}
            <div className="grid grid-cols-2 gap-4 sm:gap-6">
                {data.map((item, index) => (
                    <div
                        key={index}
                        className={`group ${onVignetteClick ? "cursor-pointer" : ""}`}
                        onClick={() => {
                            console.log('[VignetteGridCard] Vignette clicked:', item.brand_name);
                            onVignetteClick?.(item);
                        }}
                    >
                        <div className="border border-gray-200/20 bg-[#e6e6e6] dark:bg-gray-800 rounded-[24px] p-3">
                            {/* Image Container */}
                            <div className="relative w-full aspect-square rounded-[24px] bg-white mb-2 overflow-hidden">
                                <Image
                                    src={item.public_url}
                                    alt={item.brand_name}
                                    fill
                                    className="object-contain"
                                    sizes="(max-width: 640px) 50vw, 25vw"
                                />

                                {/* Score Badge with Trend */}
                                <div className="absolute bottom-3 right-3 flex items-center gap-1">
                                    <div className="bg-white rounded-full px-3 py-1.5 shadow-md flex items-center gap-1">
                                        <span className="text-sm font-semibold text-gray-900">
                                            {item.score}
                                        </span>
                                        <span className={`text-base ${item.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                                            {item.trend === 'up' ? '▲' : '▼'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Text Content */}
                            <div className="flex flex-col px-1 text-center">
                                <h3 className="text-[16px] font-bold text-gray-900 dark:text-white leading-tight">
                                    {item.brand_name}
                                </h3>
                                <p className="text-[14px] font-light italic text-gray-500 dark:text-gray-400 mt-0.5">
                                    {item.subtitle}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});

VignetteGridCard.displayName = "VignetteGridCard";
