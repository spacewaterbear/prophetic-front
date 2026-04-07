import { memo, useState } from "react";
import { Download, ChevronDown } from "lucide-react";
import { VignetteData } from "@/types/vignettes";
import { AudioCard } from "@/components/AudioCard";

interface VignetteGridCardProps {
    data: VignetteData[];
    onVignetteClick?: (vignette: VignetteData) => void;
    forceArtLayout?: boolean;
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

const VignetteItem = ({ item, onVignetteClick, forceArtLayout }: { item: VignetteData; onVignetteClick?: (v: VignetteData) => void; forceArtLayout?: boolean }) => {
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

    const isArt = process.env.NEXT_PUBLIC_SPECIALITY === "art" || forceArtLayout;

    if (isArt) {
        return (
            <div
                className={`group ${onVignetteClick ? "cursor-pointer" : ""}`}
                onClick={() => onVignetteClick?.(item)}
            >
                <div className="border border-gray-200/20 bg-[#e6e6e6] dark:bg-gray-800 rounded-[24px] p-3">
                    <div className="relative w-full aspect-square rounded-[24px] mb-2 overflow-hidden">
                        <img
                            src={item.public_url}
                            alt={item.brand_name}
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                        {item.score != null && item.trend != null && (
                            <div className="absolute bottom-3 right-3 flex items-center gap-1">
                                <div className="bg-white rounded-full px-3 py-1.5 shadow-md flex items-center gap-1">
                                    <span className="text-sm font-semibold text-gray-900">{item.score}</span>
                                    <span className={`text-base ${isUp ? "text-green-500" : "text-red-500"}`}>
                                        {isUp ? "▲" : "▼"}
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
            </div>
        );
    }

    const isMain = process.env.NEXT_PUBLIC_SPECIALITY === "main";

    if (isMain) {
        const TOTAL_DOTS = 12;
        const filledDots = item.score != null ? Math.round((item.score / 100) * TOTAL_DOTS) : 0;

        return (
            <div
                className={`${onVignetteClick ? "cursor-pointer" : ""} relative rounded-[24px] overflow-hidden shadow-sm`}
                style={{ aspectRatio: "5/6" }}
                onClick={() => onVignetteClick?.(item)}
            >
                {/* Full-card background image */}
                <img
                    src={item.public_url}
                    alt={item.brand_name}
                    className="absolute inset-0 w-full h-full object-cover"
                />

                {/* Dark info panel — bottom ~39% */}
                <div className="absolute bottom-[-1px] left-0 right-0 bg-[#252525] rounded-[24px] px-5 pt-5 pb-9">
                    {/* Category alias — Inter Bold lowercase */}
                    {item.category_alias && (
                        <p
                            className="text-[13px] font-bold text-white leading-tight mb-1"
                            style={{ fontFamily: "var(--font-inter)" }}
                        >
                            {item.category_alias}
                        </p>
                    )}

                    {/* Brand name — Instrument Serif uppercase */}
                    <h3
                        className="text-white uppercase leading-[1.05] line-clamp-2 mb-3"
                        style={{
                            fontFamily: "var(--font-instrument-serif)",
                            fontSize: "clamp(16px, 4.5vw, 20px)",
                            letterSpacing: "0.01em",
                        }}
                    >
                        {item.brand_name}
                    </h3>

                    {/* Score dots + number */}
                    {item.score != null && (
                        <div className="flex items-center gap-3 mb-3">
                            <div className="flex gap-[5px] items-center">
                                {Array.from({ length: TOTAL_DOTS }).map((_, i) => (
                                    <div
                                        key={i}
                                        className={`w-[14px] h-[14px] rounded-full shrink-0 ${i < filledDots ? "bg-white" : "border border-white/40"}`}
                                    />
                                ))}
                            </div>
                            <span
                                className="text-white font-black leading-none"
                                style={{
                                    fontFamily: "var(--font-instrument-serif)",
                                    fontSize: "clamp(28px, 6vw, 40px)",
                                }}
                            >
                                {item.score}
                            </span>
                        </div>
                    )}

                    {/* Trend row */}
                    {item.subtitle && (
                        <div className="flex items-center gap-2">
                            {item.trend != null && (
                                <span className={`text-[17px] leading-none ${isUp ? "text-green-500" : "text-red-500"}`}>
                                    {isUp ? "▲" : "▼"}
                                </span>
                            )}
                            <span
                                className={`text-[13px] italic text-white/70 leading-none ${item.category === "CASH_FLOW_LEASING" ? "whitespace-pre-line" : ""}`}
                                style={{ fontFamily: "var(--font-inter)" }}
                            >
                                {item.subtitle}
                            </span>
                        </div>
                    )}
                </div>

                {/* Chevron */}
                <div className="absolute bottom-2.5 left-0 right-0 flex justify-center pointer-events-none">
                    <ChevronDown className="w-4 h-4 text-white/50" />
                </div>
            </div>
        );
    }

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
                <div className="flex items-center gap-1.5">
                    <p className={`text-[15px] font-bold ${textColor} leading-tight drop-shadow-sm`}>
                        {item.brand_name}
                    </p>
                    {item.primary_country && (
                        <span className={`text-[12px] font-medium ${textColor} opacity-70 leading-tight drop-shadow-sm`}>
                            {item.primary_country}
                        </span>
                    )}
                </div>
                <h3
                    className={`text-[26px] leading-[1.1] ${textColor} mt-0.5 line-clamp-2 drop-shadow-sm`}
                    style={{ fontFamily: "var(--font-spectral)", fontStyle: "italic", paddingTop: "4px" }}
                >
                    {item.category_alias}
                </h3>
            </div>

            {/* Footer bar — bottom overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-3">
                <div className={`flex items-center justify-between bg-white rounded-[14px] px-3 shadow-sm ${item.category === "CASH_FLOW_LEASING" ? "py-4" : "py-2"}`}>
                    <div className="flex items-center gap-1.5 min-w-0">
                        {item.trend != null && (
                            <span className="shrink-0 text-[10px] leading-none" style={{ color: isUp ? "#22c55e" : "#ef4444" }}>
                                {isUp ? "▲" : "▼"}
                            </span>
                        )}
                        <span className={`text-[13px] font-medium italic text-[#9ca3af] ${item.category === "CASH_FLOW_LEASING" ? "whitespace-pre-line" : "truncate"}`}>
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
export const VignetteGridCard = memo(({ data, onVignetteClick, forceArtLayout }: VignetteGridCardProps) => {
    if (!data || data.length === 0) {
        return null;
    }

    return (
        <div className="w-full">
            {/* Vignette Grid - 1 col on mobile, 2 cols on sm+ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {data.map((item, index) => (
                    <VignetteItem key={index} item={item} onVignetteClick={onVignetteClick} forceArtLayout={forceArtLayout} />
                ))}
            </div>
        </div>
    );
});

VignetteGridCard.displayName = "VignetteGridCard";
