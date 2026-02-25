import Image from "next/image";
import { memo, useState } from "react";
import { ImageOff, Download, FileText } from "lucide-react";
import { VignetteData } from "@/types/vignettes";
import { AudioCard } from "@/components/AudioCard";

interface VignetteGridCardProps {
    data: VignetteData[];
    onVignetteClick?: (vignette: VignetteData) => void;
}

const PdfCard = ({ item }: { item: VignetteData }) => {
    const [downloading, setDownloading] = useState(false);
    const [imageError, setImageError] = useState(false);

    async function handleDownload(e: React.MouseEvent) {
        e.stopPropagation();
        if (downloading) return;
        const fileName = item.pdf_url?.split("/").pop();
        if (!fileName) return;
        setDownloading(true);
        try {
            const res = await fetch(`/api/pdf-url?fileName=${encodeURIComponent(fileName)}`);
            const data = await res.json();
            if (!data.signedUrl) throw new Error(data.error ?? "No signed URL");
            const a = document.createElement("a");
            a.href = data.signedUrl;
            a.download = fileName;
            a.click();
        } catch (err) {
            console.error("[PdfCard] download failed:", err);
        } finally {
            setDownloading(false);
        }
    }

    return (
        <div className="border border-gray-200/20 bg-[#e6e6e6] dark:bg-gray-800 rounded-[24px] p-3">
            <div className="relative w-full aspect-square rounded-[24px] mb-2 overflow-hidden group/pdf">
                {/* Image */}
                {!imageError ? (
                    <Image
                        src={item.public_url}
                        alt={item.brand_name}
                        fill
                        className="object-cover transition-[filter] duration-300 group-hover/pdf:blur-sm"
                        sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 20vw"
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <div className="flex items-center justify-center h-full bg-gray-200 dark:bg-gray-700 transition-[filter] duration-300 group-hover/pdf:blur-sm">
                        <FileText className="w-12 h-12 text-gray-400" strokeWidth={1.5} />
                    </div>
                )}

                {/* Hover overlay with download button */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/pdf:opacity-100 transition-opacity duration-300">
                    <button
                        onClick={handleDownload}
                        disabled={downloading}
                        aria-label="Download PDF"
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 shadow-lg"
                    >
                        <Download className="w-4 h-4" />
                        {downloading ? "…" : "Télécharger"}
                    </button>
                </div>

                {/* Score badge */}
                {item.score != null && item.trend != null && (
                    <div className="absolute bottom-3 right-3 flex items-center gap-1 z-10">
                        <div className="bg-white rounded-full px-3 py-1.5 shadow-md flex items-center gap-1">
                            <span className="text-sm font-semibold text-gray-900">{item.score}</span>
                            <span className={`text-base ${item.trend === "up" ? "text-green-500" : "text-red-500"}`}>
                                {item.trend === "up" ? "▲" : "▼"}
                            </span>
                        </div>
                    </div>
                )}
            </div>
            <div className="flex flex-col px-1 text-center h-[62px] justify-center">
                <h3 className="text-[16px] font-bold text-gray-900 dark:text-white leading-tight line-clamp-2">{item.brand_name}</h3>
                <p className="text-[14px] font-light italic text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{item.subtitle}</p>
            </div>
        </div>
    );
};

const VignetteItem = ({ item, onVignetteClick }: { item: VignetteData; onVignetteClick?: (v: VignetteData) => void }) => {
    const [imageError, setImageError] = useState(false);

    if (item.media_type === "pdf") {
        return <PdfCard item={item} />;
    }

    if (item.media_type === "audio") {
        return (
            <div className="group">
                <AudioCard
                    title={item.brand_name}
                    subtitle={item.subtitle}
                    src={item.audio_url?.split('/').pop()}
                    score={item.score}
                    trend={item.trend ?? "neutral"}
                />
            </div>
        );
    }

    return (
        <div
            className={`group ${onVignetteClick ? "cursor-pointer" : ""}`}
            onClick={() => {
                console.log('[VignetteGridCard] Vignette clicked:', item.brand_name);
                onVignetteClick?.(item);
            }}
        >
            <div className="border border-gray-200/20 bg-[#e6e6e6] dark:bg-gray-800 rounded-[24px] p-3">
                {/* Image Container */}
                <div className="relative w-full aspect-square rounded-[24px] mb-2 overflow-hidden">
                    {!imageError ? (
                        <Image
                            src={item.public_url}
                            alt={item.brand_name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 20vw"
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full bg-gray-200 dark:bg-gray-700">
                            <ImageOff className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                        </div>
                    )}

                    {/* Score Badge with Trend */}
                    {item.score != null && item.trend != null && (
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
                    )}
                </div>

                {/* Text Content */}
                <div className="flex flex-col px-1 text-center h-[62px] justify-center">
                    <h3 className="text-[16px] font-bold text-gray-900 dark:text-white leading-tight line-clamp-2">
                        {item.brand_name}
                    </h3>
                    <p className="text-[14px] font-light italic text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                        {item.subtitle}
                    </p>
                </div>
            </div>
        </div>
    );
};

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
                    <VignetteItem key={index} item={item} onVignetteClick={onVignetteClick} />
                ))}
            </div>
        </div>
    );
});

VignetteGridCard.displayName = "VignetteGridCard";
