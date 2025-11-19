import {memo} from "react";

interface SellStatusBarProps {
    ratio: number; // Float between 0 and 1
    className?: string;
}

/**
 * SellStatusBar - Displays a horizontal progress bar with color coding
 *
 * Color scheme:
 * - Red: ratio < 0.30 (Below 30%)
 * - Orange: 0.30 <= ratio <= 0.70 (30% - 70%)
 * - Green: ratio > 0.70 (Above 70%)
 */
export const SellStatusBar = memo(({ratio, className = ""}: SellStatusBarProps) => {
    // Ensure ratio is clamped between 0 and 1
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    const percentage = Math.round(clampedRatio * 100);

    // Determine color and status label based on thresholds
    const getColorAndStatus = (percent: number): {color: string; bgColor: string; label: string} => {
        if (percent < 30) {
            return {
                color: "bg-red-500",
                bgColor: "bg-red-100 dark:bg-red-950/30",
                label: "Low"
            };
        } else if (percent <= 70) {
            return {
                color: "bg-orange-500",
                bgColor: "bg-orange-100 dark:bg-orange-950/30",
                label: "Medium"
            };
        } else {
            return {
                color: "bg-green-500",
                bgColor: "bg-green-100 dark:bg-green-950/30",
                label: "High"
            };
        }
    };

    const {color, bgColor, label} = getColorAndStatus(percentage);

    return (
        <div className={`space-y-2 ${className}`}>
            {/* Header with percentage and status label */}
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Sell Ratio
                </span>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {percentage}%
                    </span>
                    <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${bgColor} ${
                            percentage < 30
                                ? "text-red-700 dark:text-red-400"
                                : percentage <= 70
                                    ? "text-orange-700 dark:text-orange-400"
                                    : "text-green-700 dark:text-green-400"
                        }`}
                    >
                        {label}
                    </span>
                </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                <div
                    className={`${color} h-full rounded-full transition-all duration-300 ease-out`}
                    style={{width: `${percentage}%`}}
                    role="progressbar"
                    aria-valuenow={percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Sell status: ${percentage}% - ${label}`}
                />
            </div>
        </div>
    );
});

SellStatusBar.displayName = "SellStatusBar";
