import { memo, useState } from "react";
import { Download } from "lucide-react";
import { VignetteData } from "@/types/vignettes";
import { AudioCard } from "@/components/AudioCard";

interface VignetteGridCardProps {
    data: VignetteData[];
    onVignetteClick?: (vignette: VignetteData) => void;
}

const PdfCard = ({ item }: { item: VignetteData }) => {
    const [downloading, setDownloading] = useState(false);

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
        <div className="group/pdf border border-gray-200/20 bg-[#e6e6e6] dark:bg-gray-800 rounded-[24px] p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
                {item.score != null && item.trend != null && (
                    <div className={`flex items-center gap-1 text-sm font-semibold ${item.trend === "up" ? "text-green-500" : "text-red-400"}`}>
                        <span>{item.score}</span>
                        <span>{item.trend === "up" ? "▲" : "▼"}</span>
                    </div>
                )}
                <button
                    onClick={handleDownload}
                    disabled={downloading}
                    aria-label="Download PDF"
                    className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-900/10 dark:bg-white/10 text-gray-700 dark:text-gray-300 text-xs font-medium hover:bg-gray-900/20 dark:hover:bg-white/20 transition-colors disabled:opacity-50"
                >
                    <Download className="w-3 h-3" />
                    {downloading ? "…" : "PDF"}
                </button>
            </div>
            <div className="flex flex-col text-center">
                <h3 className="text-[16px] font-bold text-gray-900 dark:text-white leading-tight line-clamp-2">{item.brand_name}</h3>
                <p className="text-[14px] font-light italic text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{item.subtitle}</p>
            </div>
        </div>
    );
};

const VignetteItem = ({ item, onVignetteClick }: { item: VignetteData; onVignetteClick?: (v: VignetteData) => void }) => {
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

    const isUp = item.trend === "up";

    const darkText = ["Rebag", "Farfetch"].includes(item.category_alias ?? "");
    const textColor = darkText ? "text-black" : "text-white";

    return (
        <div
            className={`${onVignetteClick ? "cursor-pointer" : ""} relative rounded-[18px] overflow-hidden aspect-square shadow-sm`}
            onClick={() => onVignetteClick?.(item)}
        >
            {/* Full-card background image */}
            <img
                src={item.public_url}
                alt={item.brand_name}
                className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Header — top-left overlay */}
            <div className="absolute top-0 left-0 right-0 p-4">
                <p className={`text-[15px] font-bold ${textColor} leading-tight drop-shadow-sm`}>
                    {item.brand_name}
                </p>
                <h3
                    className={`text-[26px] leading-[1.1] ${textColor} mt-0.5 line-clamp-2 drop-shadow-sm`}
                    style={{ fontFamily: "var(--font-spectral)", fontStyle: "italic", paddingTop: "4px" }}
                >
                    {item.category_alias}
                </h3>
            </div>

            {/* Footer bar — bottom overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-3">
                <div className="flex items-center justify-between bg-white rounded-[14px] px-3 py-2 shadow-sm">
                    <div className="flex items-center gap-1.5 min-w-0">
                        {item.trend != null && (
                            <span className="shrink-0 text-[10px] leading-none" style={{ color: isUp ? "#22c55e" : "#ef4444" }}>
                                {isUp ? "▲" : "▼"}
                            </span>
                        )}
                        <span className="text-[13px] font-medium italic text-[#9ca3af] truncate">
                            {item.subtitle}
                        </span>
                    </div>
                    {item.score != null && (
                        <span className="shrink-0 leading-none font-black text-[#e5e5e5] text-[32px] tracking-[-0.04em]">
                            {item.score}
                        </span>
                    )}
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
            {/* Vignette Grid - 1 col on mobile, 2 cols on sm+ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {data.map((item, index) => (
                    <VignetteItem key={index} item={item} onVignetteClick={onVignetteClick} />
                ))}
            </div>
        </div>
    );
});

VignetteGridCard.displayName = "VignetteGridCard";
