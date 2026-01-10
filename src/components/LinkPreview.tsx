"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Globe } from "lucide-react";
import Image from "next/image";

interface LinkPreviewData {
    title?: string;
    description?: string;
    image?: string;
    url: string;
    siteName?: string;
    favicon?: string;
}

interface LinkPreviewProps {
    url: string;
    children?: React.ReactNode;
}

export function LinkPreview({ url, children }: LinkPreviewProps) {
    const [previewData, setPreviewData] = useState<LinkPreviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchPreview = async () => {
            try {
                const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
                if (response.ok) {
                    const data = await response.json();
                    setPreviewData(data);
                } else {
                    setError(true);
                }
            } catch (err) {
                console.error("Failed to fetch link preview:", err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        fetchPreview();
    }, [url]);

    // Show loading state briefly
    if (loading) {
        return (
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
            >
                {children || url}
            </a>
        );
    }

    // If error or no preview data, show regular link
    if (error || !previewData || (!previewData.title && !previewData.image)) {
        return (
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
            >
                {children || url}
            </a>
        );
    }

    // Show rich preview card
    return (
        <div className="my-4">
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block group border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200 hover:shadow-lg bg-white dark:bg-gray-800/50"
            >
                <div className="flex flex-col sm:flex-row">
                    {/* Image Section */}
                    {previewData.image && (
                        <div className="relative w-full sm:w-48 h-48 sm:h-auto flex-shrink-0 bg-gray-100 dark:bg-gray-700">
                            <Image
                                src={previewData.image}
                                alt={previewData.title || "Link preview"}
                                fill
                                className="object-cover"
                                unoptimized
                                onError={(e) => {
                                    // Hide image on error
                                    const target = e.target as HTMLElement;
                                    target.style.display = "none";
                                }}
                            />
                        </div>
                    )}

                    {/* Content Section */}
                    <div className="flex-1 p-4 min-w-0">
                        <div className="flex items-start gap-2">
                            {previewData.favicon ? (
                                <Image
                                    src={previewData.favicon}
                                    alt=""
                                    width={16}
                                    height={16}
                                    className="mt-1 flex-shrink-0"
                                    unoptimized
                                    onError={(e) => {
                                        const target = e.target as HTMLElement;
                                        target.style.display = "none";
                                    }}
                                />
                            ) : (
                                <Globe className="w-4 h-4 mt-1 flex-shrink-0 text-gray-400" />
                            )}
                            <div className="flex-1 min-w-0">
                                {previewData.siteName && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 truncate">
                                        {previewData.siteName}
                                    </p>
                                )}
                                {previewData.title && (
                                    <div className="font-semibold text-base text-gray-900 dark:text-gray-100 mb-1 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        {previewData.title}
                                    </div>
                                )}
                                {previewData.description && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                                        {previewData.description}
                                    </p>
                                )}
                                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                    <span className="truncate">{new URL(url).hostname}</span>
                                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </a>
        </div>
    );
}
