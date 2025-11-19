import {memo} from "react";
import {TrendingUp, Users, LucideIcon} from "lucide-react";

interface MetricBadgeProps {
    ratio: number; // Float between 0 and 1
    type: "sell" | "social";
    className?: string;
}

/**
 * MetricBadge - Luxury badge design for displaying metrics
 *
 * Features:
 * - Glass morphism effect with gradient backgrounds
 * - Color-coded by performance level
 * - Icon + Value + Status in compact pill shape
 * - Subtle animations and premium styling
 *
 * Color scheme (luxury palette):
 * - Low: Deep burgundy/wine red with warm accents
 * - Medium: Rich amber/bronze tones
 * - High: Emerald/jade green with subtle shimmer
 */
export const MetricBadge = memo(({ratio, type, className = ""}: MetricBadgeProps) => {
    // Ensure ratio is clamped between 0 and 1
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    const percentage = Math.round(clampedRatio * 100);

    // Icon based on type
    const Icon: LucideIcon = type === "sell" ? TrendingUp : Users;
    const label = type === "sell" ? "Sell Ratio" : "Social Score";

    // Determine luxury color scheme based on thresholds (light + dark mode)
    const getStyleConfig = (percent: number) => {
        if (percent < 30) {
            return {
                // Deep burgundy/wine red - luxury low state
                gradient: "from-red-50/80 via-red-100/60 to-red-50/80 dark:from-red-900/20 dark:via-red-800/15 dark:to-red-900/20",
                border: "border-red-300/50 dark:border-red-700/30",
                text: "text-red-800 dark:text-red-100",
                icon: "text-red-600 dark:text-red-300",
                glow: "shadow-red-200/40 dark:shadow-red-900/20",
                statusBg: "bg-red-100/80 dark:bg-red-950/40",
                statusText: "text-red-800 dark:text-red-200",
                label: "Low"
            };
        } else if (percent <= 70) {
            return {
                // Rich amber/bronze - luxury medium state
                gradient: "from-amber-50/80 via-yellow-100/60 to-amber-50/80 dark:from-amber-900/20 dark:via-yellow-800/15 dark:to-amber-900/20",
                border: "border-amber-300/50 dark:border-amber-600/30",
                text: "text-amber-900 dark:text-amber-100",
                icon: "text-amber-700 dark:text-amber-300",
                glow: "shadow-amber-200/40 dark:shadow-amber-900/20",
                statusBg: "bg-amber-100/80 dark:bg-amber-950/40",
                statusText: "text-amber-900 dark:text-amber-200",
                label: "Medium"
            };
        } else {
            return {
                // Emerald/jade green - luxury high state
                gradient: "from-emerald-50/80 via-green-100/60 to-emerald-50/80 dark:from-emerald-900/20 dark:via-green-800/15 dark:to-emerald-900/20",
                border: "border-emerald-300/50 dark:border-emerald-600/30",
                text: "text-emerald-900 dark:text-emerald-100",
                icon: "text-emerald-700 dark:text-emerald-300",
                glow: "shadow-emerald-200/40 dark:shadow-emerald-900/20",
                statusBg: "bg-emerald-100/80 dark:bg-emerald-950/40",
                statusText: "text-emerald-900 dark:text-emerald-200",
                label: "High"
            };
        }
    };

    const style = getStyleConfig(percentage);

    return (
        <div
            className={`
                group relative inline-flex items-center gap-2.5 px-4 py-2.5
                rounded-full border
                bg-gradient-to-r ${style.gradient}
                ${style.border}
                backdrop-blur-sm
                shadow-lg ${style.glow}
                transition-all duration-300 ease-out
                hover:scale-105 hover:shadow-xl
                w-full sm:w-auto sm:min-w-[280px]
                ${className}
            `}
            role="status"
            aria-label={`${label}: ${clampedRatio.toFixed(2)} (${percentage}%) - ${style.label}`}
        >
            {/* Icon */}
            <Icon className={`w-4 h-4 ${style.icon} transition-transform group-hover:scale-110`}/>

            {/* Content */}
            <div className="flex items-center gap-2">
                {/* Label (hidden on small screens) */}
                <span className={`hidden sm:inline text-xs font-medium ${style.text} opacity-80`}>
                    {label}
                </span>

                {/* Score Value and Percentage */}
                <div className="flex items-baseline gap-1.5">
                    {/* Raw Score */}
                    <span className={`text-base font-bold ${style.text} tracking-tight`}>
                        {clampedRatio.toFixed(2)}
                    </span>
                    {/* Percentage */}
                    <span className={`text-xs font-medium ${style.text} opacity-70`}>
                        ({percentage}%)
                    </span>
                </div>

                {/* Status Badge */}
                <span
                    className={`
                        text-[10px] font-medium px-2 py-0.5 rounded-full
                        ${style.statusBg} ${style.statusText}
                        border ${style.border}
                    `}
                >
                    {style.label}
                </span>
            </div>

            {/* Subtle shimmer effect on hover */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"/>
        </div>
    );
});

MetricBadge.displayName = "MetricBadge";
