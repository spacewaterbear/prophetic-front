"use client";

import { lazy, memo, Suspense, useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { useI18n } from "@/contexts/i18n-context";
import { useSidebar } from "@/contexts/sidebar-context";
import { ChatInput } from "@/components/ChatInput";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ShareButton } from "@/components/ShareButton";
import { ModelSelector } from "@/components/ModelSelector";
import { DEFAULT_NON_ADMIN_MODEL } from "@/lib/models";
import { TypingIndicator } from "@/components/TypingIndicator";
import { VignetteData } from "@/types/vignettes";
import { useChatConversation, Message } from "@/hooks/useChatConversation";
import { Button } from "@/components/ui/button";
import { Check, Copy, FileDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import {
    convertMarkdownTablesToStyledHtml,
    convertAsciiTablesToHtml,
    convertRankingListsToHtml,
    convertExtendedRankingsToHtml,
    convertAllocationProfilesToHtml,
} from "@/lib/markdown-utils";

// Lazy load components
const Markdown = lazy(() =>
    import("@/components/Markdown").then((mod) => ({ default: mod.Markdown })),
);
const ArtistCard = lazy(() =>
    import("@/components/ArtistCard").then((mod) => ({
        default: mod.ArtistCard,
    })),
);
const MarketplaceCard = lazy(() =>
    import("@/components/MarketplaceCard").then((mod) => ({
        default: mod.MarketplaceCard,
    })),
);
const RealEstateCard = lazy(() =>
    import("@/components/RealEstateCard").then((mod) => ({
        default: mod.RealEstateCard,
    })),
);
const VignetteGridCard = lazy(() =>
    import("@/components/VignetteGridCard").then((mod) => ({
        default: mod.VignetteGridCard,
    })),
);
const ClothesSearchCard = lazy(() =>
    import("@/components/ClothesSearchCard").then((mod) => ({
        default: mod.ClothesSearchCard,
    })),
);

// Reusable AI Avatar component
const AIAvatar = memo(() => {
    const { theme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const isDark = theme === "dark" || resolvedTheme === "dark";

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <div className="hidden sm:flex w-8 h-8 sm:w-10 sm:h-10 mt-1 rounded-full items-center justify-center flex-shrink-0 overflow-hidden">
            <Image
                src={
                    mounted && isDark
                        ? "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/flavicon_white.svg"
                        : "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/flavicon_new.svg"
                }
                alt="Prophetic Orchestra"
                width={40}
                height={40}
                className="w-full h-full object-cover"
                priority
            />
        </div>
    );
});

AIAvatar.displayName = "AIAvatar";

// Memoized message component
const MessageItem = memo(
    ({ message, userName, onVignetteClick, handleBackToCategory }: {
        message: Message;
        userName: string;
        onVignetteClick?: (vignette: VignetteData) => void;
        handleBackToCategory?: (category: string) => void;
    }) => {
        const [copied, setCopied] = useState(false);
        const [pdfLoading, setPdfLoading] = useState(false);

        const handleCopy = async () => {
            try {
                await navigator.clipboard.writeText(message.content);
                setCopied(true);
                toast.success("Copied to clipboard");
                setTimeout(() => setCopied(false), 2000);
            } catch (error) {
                console.error("Failed to copy:", error);
                toast.error("Failed to copy to clipboard");
            }
        };

        const handleExportPdf = async () => {
            if (!message.content) return;
            setPdfLoading(true);
            try {
                const html2pdf = (await import("html2pdf.js")).default;
                const { marked } = await import("marked");

                // Apply the same markdown pipeline as the Markdown component
                let html = await marked(message.content);
                html = convertAllocationProfilesToHtml(html);
                html = convertAsciiTablesToHtml(html);
                html = convertExtendedRankingsToHtml(html);
                html = convertRankingListsToHtml(html);
                html = convertMarkdownTablesToStyledHtml(html);

                // Replace class attributes with inline styles for PDF rendering
                const classToStyle: Record<string, string> = {
                    // Ranking lists
                    'ranking-list': "display:flex;flex-direction:column;gap:12px;margin:16px 0;",
                    'ranking-card': "background:#fff;border:1px solid #e4e4e7;border-radius:14px;padding:16px;margin-bottom:8px;",
                    'ranking-header': "display:flex;align-items:center;gap:12px;margin-bottom:12px;",
                    'ranking-number': "font-family:'JetBrains Mono',monospace;font-size:18px;font-weight:600;color:#352ee8;min-width:32px;",
                    'ranking-name': "font-family:'EB Garamond',Georgia,serif;font-size:16px;font-weight:500;color:#18181b;",
                    'ranking-progress-bar': "width:100%;height:6px;background:rgba(0,0,0,0.05);border-radius:3px;overflow:hidden;margin-bottom:8px;",
                    'ranking-progress-fill': "height:100%;background:#352ee8;border-radius:3px;",
                    'ranking-description': "font-family:'Inter',sans-serif;font-size:12px;color:#71717a;line-height:1.4;",
                    // Extended rankings
                    'extended-rankings': "display:flex;flex-direction:column;gap:12px;margin:20px 0;",
                    'extended-ranking-card': "background:#fff;border:1px solid #e4e4e7;border-radius:14px;padding:16px;margin-bottom:8px;",
                    'extended-ranking-header': "display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;",
                    'extended-ranking-number': "font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;color:#352ee8;letter-spacing:0.5px;",
                    'extended-ranking-score': "font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:#18181b;background:rgba(0,0,0,0.05);padding:4px 10px;border-radius:8px;",
                    'extended-ranking-name': "font-family:'EB Garamond',Georgia,serif;font-size:16px;font-weight:600;color:#18181b;margin-bottom:12px;line-height:1.3;",
                    'extended-ranking-details': "display:flex;flex-direction:column;gap:6px;",
                    'extended-ranking-detail': "font-family:'Inter',sans-serif;font-size:12px;color:#a1a1aa;line-height:1.5;",
                    // Allocation profiles
                    'allocation-profiles': "display:flex;flex-direction:column;gap:16px;margin:20px 0;",
                    'allocation-card': "background:#fff;border:1px solid #e4e4e7;border-radius:14px;padding:20px;margin-bottom:8px;",
                    'allocation-title': "font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600;color:#71717a;letter-spacing:0.5px;margin-bottom:12px;",
                    'allocation-divider': "width:100%;height:1px;background:#e4e4e7;margin-bottom:16px;",
                    'allocation-items': "display:flex;flex-direction:column;gap:14px;",
                    'allocation-item': "display:flex;flex-direction:column;gap:6px;",
                    'allocation-label': "display:flex;justify-content:space-between;align-items:center;",
                    'allocation-category': "font-family:'Inter',sans-serif;font-size:13px;color:#a1a1aa;",
                    'allocation-percentage': "font-family:'JetBrains Mono',monospace;font-size:12px;color:#18181b;font-weight:600;",
                    'allocation-progress-bar': "width:100%;height:4px;background:rgba(0,0,0,0.05);border-radius:2px;overflow:hidden;",
                    'allocation-progress-fill': "height:100%;background:#352ee8;border-radius:2px;",
                    'allocation-focus': "margin-top:16px;padding-top:16px;border-top:1px solid #e4e4e7;",
                    'allocation-focus-label': "font-family:'Inter',sans-serif;font-size:12px;color:#71717a;margin-bottom:8px;",
                    'allocation-focus-artists': "display:flex;flex-direction:column;gap:4px;",
                    'allocation-artist': "font-family:'EB Garamond',Georgia,serif;font-size:13px;color:#a1a1aa;line-height:1.4;",
                    // ASCII tables
                    'ascii-table-wrapper': "margin:16px 0;border-radius:14px;overflow:hidden;",
                    'ascii-table': "width:100%;border-collapse:collapse;background:#fff;border:1px solid #e4e4e7;border-radius:14px;",
                    'label-cell': "padding:12px 16px;font-size:13px;color:#18181b;font-weight:400;min-width:120px;border-bottom:1px solid #f4f4f5;",
                    'value-cell': "padding:12px 16px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#18181b;text-align:right;border-bottom:1px solid #f4f4f5;",
                    // Styled markdown tables
                    'table-scroll-wrapper': "overflow-x:auto;margin:16px 0;",
                    'premium-table-container': "",
                };
                for (const [cls, style] of Object.entries(classToStyle)) {
                    if (!style) continue;
                    html = html.replace(new RegExp(`class="([^"]*\\b${cls}\\b[^"]*)"`, 'g'), (match, classes) => {
                        return `${match} style="${style}"`;
                    });
                }

                // Inject inline styles on standard HTML tags
                const tagStyles: Record<string, string> = {
                    'h1': "font-family:'EB Garamond',Georgia,serif;font-size:1.75rem;font-weight:500;color:#18181b;margin:8px 0 16px;letter-spacing:-0.01em;line-height:1.2;",
                    'h2': "font-family:'EB Garamond',Georgia,serif;font-size:1.25rem;font-weight:500;color:#18181b;margin:20px 0 12px;line-height:1.3;",
                    'h3': "font-family:'EB Garamond',Georgia,serif;font-size:0.95rem;font-weight:500;color:#52525b;margin:16px 0 12px;",
                    'h4': "font-family:'EB Garamond',Georgia,serif;font-size:0.875rem;font-weight:500;color:#52525b;margin:14px 0 10px;",
                    'p': "margin-bottom:12px;line-height:1.7;color:#18181b;font-family:'Inter',sans-serif;font-size:13px;",
                    'strong': "color:#18181b;font-weight:600;",
                    'em': "font-style:italic;color:#52525b;",
                    'a': "color:#352ee8;text-decoration:none;",
                    'ul': "list-style:disc;margin:12px 0;padding-left:20px;",
                    'ol': "margin:12px 0;padding-left:20px;",
                    'li': "margin-bottom:6px;font-size:13px;color:#18181b;font-family:'Inter',sans-serif;line-height:1.7;",
                    'blockquote': "border-left:2px solid #c4a97d;padding-left:14px;margin:16px 0;",
                    'hr': "border:none;border-top:1px solid #e5e0d8;margin:20px 0;",
                    'code': "font-family:'JetBrains Mono',monospace;font-size:11px;color:#71717a;background:#f4f4f5;padding:2px 6px;border:1px solid #e4e4e7;border-radius:4px;",
                    'pre': "background:#f4f4f5;border:1px solid #e4e4e7;border-radius:8px;padding:16px;margin-bottom:12px;overflow-x:auto;",
                };
                for (const [tag, style] of Object.entries(tagStyles)) {
                    // Only add style to tags that don't already have a style attribute
                    html = html.replace(new RegExp(`<${tag}((?![^>]*style=)[^>]*)>`, 'g'), `<${tag}$1 style="${style}">`);
                }
                // Fix pre > code: override code background inside pre
                html = html.replace(/<pre[^>]*>\s*<code/g, (match) => {
                    return match.replace(/<code/g, '<code style="font-family:\'JetBrains Mono\',monospace;font-size:12px;color:#52525b;background:transparent;border:none;padding:0;white-space:pre-wrap;line-height:1.4;"');
                });

                // For table elements that already have class+style from conversions, add tag styles if missing
                const tableTagStyles: Record<string, string> = {
                    'table': "width:100%;border-collapse:collapse;margin:16px 0;border:1px solid #e4e4e7;",
                    'thead': "background:#f9f7f4;",
                    'th': "padding:10px 14px;text-align:left;font-size:11px;font-weight:600;color:#52525b;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e4e4e7;font-family:'Inter',sans-serif;",
                    'td': "padding:10px 14px;font-size:13px;color:#18181b;border-bottom:1px solid #f4f4f5;font-family:'Inter',sans-serif;",
                    'tr': "border-bottom:1px solid #f4f4f5;",
                };
                for (const [tag, style] of Object.entries(tableTagStyles)) {
                    html = html.replace(new RegExp(`<${tag}((?![^>]*style=)[^>]*)>`, 'g'), `<${tag}$1 style="${style}">`);
                }

                const now = new Date();
                const dateStr = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

                const fullHtml = `
                    <div style="font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;font-size:13px;color:#18181b;line-height:1.7;padding:20px;">
                        <div style="text-align:center;margin-bottom:32px;padding-bottom:16px;border-bottom:2px solid #c4a97d;">
                            <h1 style="font-family:'EB Garamond',Georgia,serif;font-size:22px;font-weight:600;margin:0 0 4px 0;color:#18181b;">Prophetic Orchestra</h1>
                            <p style="font-family:'Inter',sans-serif;font-size:12px;color:#888;margin:0;">Report &mdash; ${dateStr}</p>
                        </div>
                        <div>${html}</div>
                    </div>
                `;

                const filename = `prophetic-report-${now.toISOString().slice(0, 10)}.pdf`;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (html2pdf() as any)
                    .set({
                        margin: [15, 15, 15, 15],
                        filename,
                        image: { type: "jpeg", quality: 0.95 },
                        html2canvas: { scale: 2, useCORS: true },
                        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
                        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
                    })
                    .from(fullHtml, "string")
                    .save();

                toast.success("PDF report downloaded");
            } catch (error) {
                console.error("Failed to generate PDF:", error);
                toast.error("Failed to generate PDF report");
            } finally {
                setPdfLoading(false);
            }
        };

        return (
            <div className={`flex gap-2 sm:gap-4 items-start w-full ${message.sender === "user" ? "justify-end" : "justify-start"}`} data-message-id={message.id}>
                {message.sender === "ai" && <AIAvatar />}
                <div className={`group flex flex-col gap-2 ${message.sender === "ai" ? "w-full" : ""}`}>
                    <div
                        className={`py-4 sm:py-5 rounded-2xl overflow-hidden ${message.sender === "user"
                            ? "bg-[rgb(230,220,210)] dark:bg-gray-700 text-gray-900 dark:text-white max-w-[90vw] sm:max-w-3xl lg:max-w-4xl px-3 sm:px-4"
                            : "bg-[rgb(247,240,232)] dark:bg-[rgb(1,1,0)] text-gray-900 dark:text-white max-w-[90vw] sm:max-w-3xl lg:max-w-4xl px-3 sm:px-4"
                            }`}
                    >
                        {message.sender === "user" ? (
                            <Suspense
                                fallback={
                                    <div className="text-base text-gray-400">Loading...</div>
                                }
                            >
                                <Markdown content={message.content} className="text-base" />
                            </Suspense>
                        ) : message.type === "artist_info" && message.artist ? (
                            <Suspense
                                fallback={
                                    <div className="text-base text-gray-400">Loading...</div>
                                }
                            >
                                <ArtistCard
                                    artist={message.artist}
                                    message={message.message}
                                    researchType={message.research_type}
                                    text={message.text}
                                    streamingText={message.streaming_text}
                                    hasExistingData={message.has_existing_data}
                                />
                            </Suspense>
                        ) : (
                            <>
                                {message.content && (
                                    <Suspense
                                        fallback={
                                            <div className="text-base text-gray-400">Loading...</div>
                                        }
                                    >
                                        <Markdown
                                            content={message.content}
                                            className="text-base"
                                            categoryName={message.vignetteCategory ? CATEGORY_DISPLAY_NAMES[message.vignetteCategory] : undefined}
                                            onCategoryClick={message.vignetteCategory && handleBackToCategory ? () => handleBackToCategory(message.vignetteCategory!) : undefined}
                                        />
                                    </Suspense>
                                )}

                                {message.marketplace_data &&
                                    (!message.marketplace_position ||
                                        message.marketplace_position === "after") && (
                                        <div className={message.content ? "mt-4" : ""}>
                                            <Suspense
                                                fallback={
                                                    <div className="text-base text-gray-400">
                                                        Loading marketplace data...
                                                    </div>
                                                }
                                            >
                                                <MarketplaceCard data={message.marketplace_data} />
                                            </Suspense>
                                        </div>
                                    )}

                                {message.marketplace_data &&
                                    message.marketplace_position === "before" && (
                                        <div className={message.content ? "mb-4" : ""}>
                                            <Suspense
                                                fallback={
                                                    <div className="text-base text-gray-400">
                                                        Loading marketplace data...
                                                    </div>
                                                }
                                            >
                                                <MarketplaceCard data={message.marketplace_data} />
                                            </Suspense>
                                        </div>
                                    )}

                                {message.real_estate_data && (
                                    <div className={message.content ? "mt-4" : ""}>
                                        <Suspense
                                            fallback={
                                                <div className="text-base text-gray-400">
                                                    Loading real estate data...
                                                </div>
                                            }
                                        >
                                            <RealEstateCard data={message.real_estate_data} />
                                        </Suspense>
                                    </div>
                                )}

                                {message.vignette_data && (
                                    <div className={message.content ? "mt-4" : ""}>
                                        <Suspense
                                            fallback={
                                                <div className="text-base text-gray-400">
                                                    Loading vignettes...
                                                </div>
                                            }
                                        >
                                            <VignetteGridCard data={message.vignette_data} onVignetteClick={onVignetteClick} />
                                        </Suspense>
                                    </div>
                                )}

                                {message.clothes_search_data && (
                                    <div className={message.content ? "mt-4" : ""}>
                                        <Suspense
                                            fallback={
                                                <div className="text-base text-gray-400">
                                                    Loading fashion items...
                                                </div>
                                            }
                                        >
                                            <ClothesSearchCard data={message.clothes_search_data} />
                                        </Suspense>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity self-end">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleCopy}
                            className={`h-7 w-7 sm:h-8 sm:w-8 ${message.sender === "user"
                                ? "text-gray-500 hover:bg-black/5 dark:text-white dark:hover:bg-white/20"
                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                }`}
                            aria-label="Copy message"
                        >
                            {copied ? (
                                <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                            ) : (
                                <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                            )}
                        </Button>
                        {message.sender === "ai" && message.content && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleExportPdf}
                                disabled={pdfLoading}
                                className="h-7 w-7 sm:h-8 sm:w-8 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                aria-label="Export as PDF"
                            >
                                <FileDown className={`h-3 w-3 sm:h-4 sm:w-4 ${pdfLoading ? "animate-pulse" : ""}`} />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        );
    },
);

MessageItem.displayName = "MessageItem";

// Helper function to check if user is admin
const isAdminUser = (session: { user?: { status?: string } } | null): boolean => {
    return session?.user?.status === "admini";
};

// Helper function to extract image name from public_url
const getImageNameFromUrl = (url: string): string => {
    const parts = url.split("/");
    return parts[parts.length - 1];
};

// Category name mapping for display
const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
    ART: "Art",
    ART_TRADING_VALUE: "Art Trading Value",
    BIJOUX: "Bijoux",
    CARDS_US: "US Sports Cards",
    CARS: "Voitures de Collections",
    CASH_FLOW_LEASING: "Cash-Flow Leasing",
    IMMO_LUXE: "Immobilier de Luxe",
    MONTRES_LUXE: "Montres de Luxe",
    SACS: "Sacs de Luxe",
    SNEAKERS: "Sneakers",
    WHISKY: "Whisky",
    WINE: "Wine",
    MARCHE_SPOT: "Marché Spot",
};

export default function ChatPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const { theme, resolvedTheme } = useTheme();
    const isDark = theme === "dark" || resolvedTheme === "dark";
    const { t } = useI18n();

    // Extract conversation ID from params (optional catch-all route)
    const conversationIdParam = params.conversationId as string[] | undefined;
    const conversationId = conversationIdParam?.[0] ? parseInt(conversationIdParam[0], 10) : null;

    const [mounted, setMounted] = useState(false);
    const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_NON_ADMIN_MODEL);
    const [selectedAgent, setSelectedAgent] = useState<'discover' | 'intelligence' | 'oracle'>('discover');
    const [profileUsername, setProfileUsername] = useState<string | null>(null);
    const { setSidebarOpen, isMobile } = useSidebar();

    // Vignette state (for welcome screen)
    const [vignettes, setVignettes] = useState<VignetteData[]>([]);
    const [vignetteLoading, setVignetteLoading] = useState(false);
    const [vignetteError, setVignetteError] = useState<string | null>(null);
    const welcomeContainerRef = useRef<HTMLDivElement>(null);

    // Use the custom hook for conversation logic
    const {
        messages,
        input,
        setInput,
        isLoading,
        streamingMessage,
        streamingMarketplaceData,
        streamingRealEstateData,
        streamingVignetteData,
        streamingClothesSearchData,
        streamingVignetteCategory,
        currentStatus,
        showStreamingIndicator,
        messagesEndRef,
        messagesContainerRef,
        disableAutoScrollRef,
        lastUserMessageId,
        shouldScrollToTop,
        setShouldScrollToTop,
        handleSend,
        handleFlashcardClick,
        handleScroll,
        addAiMessage,
        streamVignetteMarkdown,
        streamMarkdown,
        clearMessages,
    } = useChatConversation({ conversationId, selectedModel });

    useEffect(() => {
        const handleDeepSearch = (e: CustomEvent<{ text?: string }>) => {
            const text = e.detail?.text;
            if (text) {
                console.log(`[Chat Page] Triggering deep search for: ${text}`);
                handleSend(`Deep search about: "${text}"`);
            }
        };

        const handleChatButton = (e: CustomEvent<{ text?: string }>) => {
            const text = e.detail?.text;
            if (text) {
                console.log(`[Chat Page] Chat button clicked: ${text}`);
                handleSend(text);
            }
        };

        window.addEventListener("triggerDeepSearch", handleDeepSearch as EventListener);
        window.addEventListener("triggerChatButton", handleChatButton as EventListener);
        return () => {
            window.removeEventListener("triggerDeepSearch", handleDeepSearch as EventListener);
            window.removeEventListener("triggerChatButton", handleChatButton as EventListener);
        };
    }, [handleSend]);

    useEffect(() => {
        setMounted(true);
        // Load saved agent from localStorage
        const savedAgent = localStorage.getItem('selectedAgent');
        if (savedAgent && ['discover', 'intelligence', 'oracle'].includes(savedAgent)) {
            setSelectedAgent(savedAgent as 'discover' | 'intelligence' | 'oracle');
        }
    }, []);

    // Fetch username from profiles table
    useEffect(() => {
        const fetchProfileUsername = async () => {
            if (session?.user?.id) {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('username')
                    .eq('id', session.user.id)
                    .single();

                if (!error && data?.username) {
                    setProfileUsername(data.username);
                }
            }
        };

        fetchProfileUsername();
    }, [session?.user?.id]);

    // Redirect to login if not authenticated (skip in dev mode)
    useEffect(() => {
        if (process.env.NEXT_PUBLIC_SKIP_AUTH === "true") {
            return;
        }
        if (status === "unauthenticated") {
            router.push("/login");
        } else if (
            status === "authenticated" &&
            (session?.user as { status?: string })?.status === "unauthorized"
        ) {
            router.push("/registration-pending");
        }
    }, [status, session, router]);

    // Enforce default model for non-admin users
    useEffect(() => {
        if (session && !isAdminUser(session)) {
            setSelectedModel(DEFAULT_NON_ADMIN_MODEL);
        }
    }, [session]);

    // Validate saved agent against user's subscription status
    useEffect(() => {
        if (session) {
            const userStatus = (session.user as { status?: string })?.status;
            const getAvailableAgents = (status: string | undefined): ('discover' | 'intelligence' | 'oracle')[] => {
                switch (status) {
                    case 'discover': return ['discover'];
                    case 'intelligence': return ['discover', 'intelligence'];
                    case 'oracle':
                    case 'admini': return ['discover', 'intelligence', 'oracle'];
                    default: return ['discover'];
                }
            };
            const availableAgents = getAvailableAgents(userStatus);
            if (!availableAgents.includes(selectedAgent)) {
                setSelectedAgent('discover');
                localStorage.setItem('selectedAgent', 'discover');
            }
        }
    }, [session, selectedAgent]);

    // Fetch vignettes when category changes (welcome screen only)
    useEffect(() => {
        const category = searchParams.get("category");
        console.log("[Chat Page] useEffect triggered, category:", category, "conversationId:", conversationId, "isLoading:", isLoading);

        // If we have a pending stream, we are in the middle of a redirection
        // Skip fetching vignettes to avoid the "glitch"
        if (sessionStorage.getItem('pendingVignetteStream')) {
            console.log("[Chat Page] Pending stream detected, skipping vignette fetch");
            return;
        }

        // Only fetch vignettes if we are on the welcome screen (no conversationId)
        // or if explicitly on a category URL without an active conversation
        if (category && !conversationId) {
            // Don't clear messages if we're currently loading/streaming a vignette
            if (!isLoading) {
                clearMessages();
            }

            // Scroll to top immediately when category changes
            window.scrollTo(0, 0);
            if (welcomeContainerRef.current) {
                welcomeContainerRef.current.scrollTop = 0;
            }
            if (messagesContainerRef.current) {
                messagesContainerRef.current.scrollTop = 0;
            }

            const fetchVignettes = async () => {
                console.log(`[Chat Page] Starting fetch for category: ${category}`);
                setVignetteLoading(true);
                setVignetteError(null);

                try {
                    const url = `/api/vignettes?category=${category}`;
                    console.log(`[Chat Page] Fetching from: ${url}`);
                    const response = await fetch(url);
                    console.log(`[Chat Page] Response status: ${response.status}`);

                    if (!response.ok) {
                        throw new Error(`Failed to fetch vignettes: ${response.status}`);
                    }

                    const data = await response.json();
                    console.log(`[Chat Page] Received data:`, data);
                    console.log(`[Chat Page] Number of vignettes: ${data.vignettes?.length || 0}`);
                    setVignettes(data.vignettes || []);

                    // Prevent scrolling by keeping scroll position at top
                    window.scrollTo(0, 0);
                } catch (error) {
                    console.error("[Chat Page] Error fetching vignettes:", error);
                    setVignetteError("Failed to load vignettes");
                    setVignettes([]);
                } finally {
                    setVignetteLoading(false);
                    console.log("[Chat Page] Fetch complete");
                }
            };

            fetchVignettes();
        } else if (!conversationId && !isLoading) {
            // No category and no conversation (and not loading) - clear vignettes
            console.log("[Chat Page] No category and no conversation, clearing vignettes");
            clearMessages();
            setVignettes([]);
            setVignetteError(null);
        }
        // If conversationId exists but no category, do nothing (viewing a conversation)
    }, [searchParams, conversationId, clearMessages, isLoading]);



    const handleModelChange = async (newModel: string) => {
        setSelectedModel(newModel);

        if (conversationId) {
            try {
                await fetch(`/api/conversations/${conversationId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ model: newModel }),
                });
            } catch (error) {
                console.error("Error updating conversation model:", error);
            }
        }
    };

    const handleAgentChange = (agent: 'discover' | 'intelligence' | 'oracle') => {
        setSelectedAgent(agent);
        localStorage.setItem('selectedAgent', agent);
    };

    const handleVignetteClick = async (vignette: VignetteData) => {
        const imageName = getImageNameFromUrl(vignette.public_url);
        console.log(`[Chat Page] Vignette clicked: ${vignette.brand_name}, image: ${imageName}, category: ${vignette.category}`);

        // Close sidebar on mobile when vignette is clicked
        const isMobileView = window.innerWidth < 768;
        if (isMobileView) {
            setSidebarOpen(false);
        }

        sessionStorage.setItem('disableAutoScroll', 'true');
        sessionStorage.setItem('pendingScrollToTopVignette', 'true');
        if (disableAutoScrollRef) {
            disableAutoScrollRef.current = true;
        }

        console.log('[Chat Page] Creating new conversation for vignette streaming');

        try {
            const title = vignette.brand_name.length > 50
                ? vignette.brand_name.substring(0, 50) + "..."
                : vignette.brand_name;

            const response = await fetch("/api/conversations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: title,
                    model: selectedModel,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to create conversation");
            }

            const data = await response.json();
            const newConversationId = data.conversation.id;

            // Determine stream type
            // All categories now use SSE streaming (the markdown endpoint handles special cases)
            const streamType = 'sse';

            // Store pending vignette stream info for the new page to pick up
            const pendingStream = {
                imageName: imageName,
                category: vignette.category,
                streamType: streamType,
                tier: selectedAgent.toUpperCase()
            };
            sessionStorage.setItem('pendingVignetteStream', JSON.stringify(pendingStream));

            // Refresh conversations list in sidebar
            window.dispatchEvent(new Event("refreshConversations"));

            // Navigate to the new conversation
            router.push(`/chat/${newConversationId}`);
            console.log(`[Chat Page] Navigated to new conversation: ${newConversationId} with streamType: ${streamType}`);
        } catch (error) {
            console.error("[Chat Page] Error creating conversation for vignette:", error);
            toast.error("Failed to create conversation");

            // Re-enable auto-scroll on error
            sessionStorage.removeItem('disableAutoScroll');
            if (disableAutoScrollRef) {
                disableAutoScrollRef.current = false;
            }
        }
    };

    const handleBackToCategory = (category: string) => {
        console.log(`[Chat Page] Navigating back to category: ${category}`);
        router.push(`/chat?category=${category}`);
    };

    // Show loading while checking authentication
    if (status === "loading") {
        return (
            <div className="flex h-screen items-center justify-center bg-[rgb(247,240,232)] dark:bg-[rgb(1,1,0)]">
                <div className="text-center">
                    <div className="w-64 h-32 mx-auto mb-4 flex items-center justify-center animate-pulse">
                        <Image
                            src={
                                mounted && isDark
                                    ? "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/logo_text_blanc.svg"
                                    : "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/logo_text.svg"
                            }
                            alt="Prophetic Orchestra"
                            width={256}
                            height={64}
                            className="w-full h-full object-contain"
                        />
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">{t('chat.loading')}</p>
                </div>
            </div>
        );
    }

    if (!session && process.env.NEXT_PUBLIC_SKIP_AUTH !== "true") {
        return null;
    }

    // Determine if we're showing the welcome screen or conversation view
    const isWelcomeScreen = !conversationId;

    return (
        <>
            {/* Header */}
            <header className={`relative z-10 bg-[rgba(247,240,232,0.8)] dark:bg-black backdrop-blur-md border-b border-gray-400 dark:border-gray-800 pl-14 pr-6 md:px-6 h-[52px] sm:h-[60px] flex items-center justify-between`}>
                <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <Link href="/" className="cursor-pointer">
                            <Image
                                src={
                                    mounted && isDark
                                        ? "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/logo_text_blanc.svg"
                                        : "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/logo_text.svg"
                                }
                                alt="Prophetic Orchestra"
                                width={180}
                                height={45}
                                className={isWelcomeScreen ? "h-7 sm:h-10 w-auto" : "h-6 sm:h-10 w-auto"}
                            />
                        </Link>
                    </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    {!isWelcomeScreen && isAdminUser(session) && (
                        <ModelSelector
                            selectedModel={selectedModel}
                            onModelChange={handleModelChange}
                            disabled={isLoading}
                        />
                    )}
                    <ThemeToggle />
                    {!isWelcomeScreen && (
                        <ShareButton
                            conversationId={conversationId}
                            disabled={isLoading}
                        />
                    )}
                </div>
            </header>

            {/* Main Content */}
            {isWelcomeScreen ? (
                /* Welcome Screen */
                <div
                    ref={welcomeContainerRef}
                    className="relative flex-1 bg-[rgb(247,240,232)] dark:bg-[rgb(1,1,0)] px-6 overflow-y-auto"
                >
                    <div className={`w-full max-w-4xl flex flex-col items-center py-10 mx-auto ${vignettes.length === 0 && messages.length === 0 && !streamingMessage && !vignetteLoading && !vignetteError ? 'min-h-full justify-center' : ''}`}>
                        {/* Show messages if any (e.g., from vignette click in dev mode) or streaming content */}
                        {messages.length > 0 || streamingMessage ? (
                            <div className="w-full max-w-5xl space-y-6">
                                {messages.map((message) => (
                                    <MessageItem
                                        key={message.id}
                                        message={message}
                                        userName={session?.user?.name || "User"}
                                        onVignetteClick={handleVignetteClick}
                                        handleBackToCategory={handleBackToCategory}
                                    />
                                ))}
                                {/* Streaming Message */}
                                {streamingMessage && (
                                    <div className="flex gap-2 sm:gap-4 items-start justify-start">
                                        <AIAvatar />
                                        <div className="max-w-[90vw] sm:max-w-3xl lg:max-w-4xl px-3 sm:px-4 py-4 sm:py-5 rounded-2xl overflow-hidden bg-[rgb(247,240,232)] dark:bg-[rgb(1,1,0)] text-gray-900 dark:text-white">
                                            <Markdown
                                                content={streamingMessage}
                                                className="text-base"
                                                categoryName={streamingVignetteCategory ? CATEGORY_DISPLAY_NAMES[streamingVignetteCategory] : undefined}
                                                onCategoryClick={streamingVignetteCategory ? () => handleBackToCategory(streamingVignetteCategory) : undefined}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : vignettes.length > 0 ? (
                            /* Vignettes Display */
                            <div className="w-full relative">
                                <VignetteGridCard data={vignettes} onVignetteClick={handleVignetteClick} />
                            </div>
                        ) : vignetteLoading ? (
                            /* Loading State */
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-12 h-12 border-4 border-gray-300 dark:border-gray-700 border-t-gray-900 dark:border-t-white rounded-full animate-spin" />
                                <p className="text-gray-600 dark:text-gray-400">Loading vignettes...</p>
                            </div>
                        ) : vignetteError ? (
                            /* Error State */
                            <div className="flex flex-col items-center gap-4">
                                <p className="text-red-600 dark:text-red-400">{vignetteError}</p>
                            </div>
                        ) : (
                            /* Welcome Screen */
                            <>
                                {/* Logo */}
                                <div className="w-20 h-20 mb-8 flex items-center justify-center">
                                    <Image
                                        src={
                                            mounted && isDark
                                                ? "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/flavicon_white.svg"
                                                : "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/flavicon_new.svg"
                                        }
                                        alt="Prophetic Orchestra"
                                        width={80}
                                        height={80}
                                        className="w-full h-full object-contain"
                                    />
                                </div>

                                {/* Greeting */}
                                <h1 className="text-3xl sm:text-4xl font-medium text-gray-900 dark:text-white mb-3">
                                    {t('chat.greeting').replace('{name}', profileUsername || session?.user?.name?.split(' ')[0] || '')}
                                </h1>

                                {/* Subtitle */}
                                <p className="text-base text-gray-600 dark:text-gray-400 mb-12">
                                    {t('chat.welcomeSubtitle')}
                                </p>

                                {/* Chat Input */}
                                <ChatInput
                                    input={input}
                                    setInput={setInput}
                                    handleSend={() => handleSend()}
                                    isLoading={isLoading}
                                    onFlashcardClick={handleFlashcardClick}
                                    userStatus={(session?.user as { status?: string })?.status as 'unauthorized' | 'free' | 'paid' | 'admini' | 'discover' | 'intelligence' | 'oracle' | undefined}
                                    selectedAgent={selectedAgent}
                                    onAgentChange={handleAgentChange}
                                    className="max-w-3xl"
                                />
                            </>
                        )}
                    </div>
                </div>
            ) : (
                /* Conversation View */
                <>
                    {/* Messages */}
                    <div
                        ref={messagesContainerRef}
                        onScroll={handleScroll}
                        className="chat-history py-4 sm:py-8 px-3 sm:px-6"
                    >
                        <div className="max-w-5xl mx-auto space-y-6">
                            {messages.map((message) => (
                                <MessageItem
                                    key={message.id}
                                    message={message}
                                    userName={session?.user?.name?.[0]?.toUpperCase() || "U"}
                                    onVignetteClick={handleVignetteClick}
                                    handleBackToCategory={handleBackToCategory}
                                />
                            ))}

                            {/* Typing indicator */}
                            {isLoading && !streamingMessage && !streamingMarketplaceData && !streamingVignetteData && !streamingClothesSearchData && (
                                <div className="flex gap-2 sm:gap-4 items-start justify-start">
                                    <AIAvatar />
                                    <div className="max-w-[90vw] sm:max-w-3xl lg:max-w-4xl px-3 sm:px-4 py-4 sm:py-5 rounded-2xl overflow-hidden bg-[rgb(247,240,232)] dark:bg-[rgb(1,1,0)]">
                                        <TypingIndicator />
                                        {currentStatus && (
                                            <p className="text-sm text-gray-500 dark:text-gray-400 italic mt-2">
                                                {currentStatus}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Streaming Message Bubble */}
                            {(streamingMessage ||
                                streamingMarketplaceData ||
                                streamingRealEstateData ||
                                streamingVignetteData ||
                                streamingClothesSearchData) && (
                                    <div className="flex gap-2 sm:gap-4 items-start justify-start">
                                        <AIAvatar />
                                        <div className="max-w-[90vw] sm:max-w-3xl lg:max-w-4xl px-3 sm:px-4 py-4 sm:py-5 rounded-2xl overflow-hidden bg-[rgb(247,240,232)] dark:bg-[rgb(1,1,0)] text-gray-900 dark:text-white">
                                            {streamingMessage && (
                                                <Markdown
                                                    content={streamingMessage}
                                                    className="text-base"
                                                    categoryName={streamingVignetteCategory ? CATEGORY_DISPLAY_NAMES[streamingVignetteCategory] : undefined}
                                                    onCategoryClick={streamingVignetteCategory ? () => handleBackToCategory(streamingVignetteCategory) : undefined}
                                                />
                                            )}
                                            {streamingMarketplaceData && (
                                                <div className={streamingMessage ? "mt-4" : ""}>
                                                    <Suspense
                                                        fallback={
                                                            <div className="text-base text-gray-400">
                                                                Loading marketplace data...
                                                            </div>
                                                        }
                                                    >
                                                        <MarketplaceCard data={streamingMarketplaceData} />
                                                    </Suspense>
                                                </div>
                                            )}
                                            {streamingRealEstateData && (
                                                <div className={streamingMessage || streamingMarketplaceData ? "mt-4" : ""}>
                                                    <Suspense
                                                        fallback={
                                                            <div className="text-base text-gray-400">
                                                                Loading real estate data...
                                                            </div>
                                                        }
                                                    >
                                                        <RealEstateCard data={streamingRealEstateData} />
                                                    </Suspense>
                                                </div>
                                            )}
                                            {streamingVignetteData && (
                                                <div className={streamingMessage || streamingMarketplaceData || streamingRealEstateData ? "mt-4" : ""}>
                                                    <Suspense
                                                        fallback={
                                                            <div className="text-base text-gray-400">
                                                                Loading vignettes...
                                                            </div>
                                                        }
                                                    >
                                                        <VignetteGridCard data={streamingVignetteData} onVignetteClick={handleVignetteClick} />
                                                    </Suspense>
                                                </div>
                                            )}
                                            {streamingClothesSearchData && (
                                                <div className={streamingMessage || streamingMarketplaceData || streamingRealEstateData || streamingVignetteData ? "mt-4" : ""}>
                                                    <Suspense
                                                        fallback={
                                                            <div className="text-base text-gray-400">
                                                                Loading fashion items...
                                                            </div>
                                                        }
                                                    >
                                                        <ClothesSearchCard data={streamingClothesSearchData} />
                                                    </Suspense>
                                                </div>
                                            )}
                                            {showStreamingIndicator && (
                                                <div className="mt-2">
                                                    <TypingIndicator />
                                                </div>
                                            )}
                                            {isLoading && !streamingMessage && (
                                                <TypingIndicator />
                                            )}
                                        </div>
                                    </div>
                                )}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    {/* Input Area */}
                    <div className="input-area px-6 py-3 sm:py-4 bg-[rgb(247,240,232)] dark:bg-black flex justify-center">
                        <ChatInput
                            input={input}
                            setInput={setInput}
                            handleSend={() => handleSend()}
                            isLoading={isLoading}
                            onFlashcardClick={handleFlashcardClick}
                            userStatus={(session?.user as { status?: string })?.status as 'unauthorized' | 'free' | 'paid' | 'admini' | 'discover' | 'intelligence' | 'oracle' | undefined}
                            selectedAgent={selectedAgent}
                            onAgentChange={handleAgentChange}
                            className="max-w-3xl"
                        />
                    </div>
                </>
            )}
        </>
    );
}
