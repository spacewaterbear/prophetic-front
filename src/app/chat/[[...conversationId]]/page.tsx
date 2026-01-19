"use client";

import { lazy, memo, Suspense, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { useI18n } from "@/contexts/i18n-context";
import { ChatInput } from "@/components/ChatInput";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ShareButton } from "@/components/ShareButton";
import { ModelSelector } from "@/components/ModelSelector";
import { DEFAULT_NON_ADMIN_MODEL } from "@/lib/models";
import { TypingIndicator } from "@/components/TypingIndicator";
import { VignetteData } from "@/types/vignettes";
import { useChatConversation, Message } from "@/hooks/useChatConversation";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";

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
                        ? "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/flavicon_white.svg"
                        : "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/flavicon_new.svg"
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
    ({ message, userName }: { message: Message; userName: string }) => {
        const [copied, setCopied] = useState(false);

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

        return (
            <div className={`flex gap-2 sm:gap-4 items-start w-full ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
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
                                        <Markdown content={message.content} className="text-base" />
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
                                            <VignetteGridCard data={message.vignette_data} />
                                        </Suspense>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCopy}
                        className={`h-7 w-7 sm:h-8 sm:w-8 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity self-end ${message.sender === "user"
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

    // Vignette state (for welcome screen)
    const [vignettes, setVignettes] = useState<VignetteData[]>([]);
    const [vignetteLoading, setVignetteLoading] = useState(false);
    const [vignetteError, setVignetteError] = useState<string | null>(null);

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
        currentStatus,
        showStreamingIndicator,
        messagesEndRef,
        messagesContainerRef,
        disableAutoScrollRef,
        handleSend,
        handleFlashcardClick,
        handleScroll,
    } = useChatConversation({ conversationId, selectedModel });

    useEffect(() => {
        setMounted(true);
    }, []);

    // Redirect to login if not authenticated
    useEffect(() => {
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

    // Fetch vignettes when category changes (welcome screen only)
    useEffect(() => {
        if (conversationId) return; // Skip if viewing a conversation

        const category = searchParams.get("category");
        console.log("[Chat Page] useEffect triggered, category:", category);

        if (!category) {
            console.log("[Chat Page] No category, clearing vignettes");
            setVignettes([]);
            setVignetteError(null);
            return;
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
    }, [searchParams, conversationId]);

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

    const handlePortfolioClick = () => {
        // Portfolio doesn't use flash_cards enum, only flash_card_type
        handleSend('Show me my portfolio insights', undefined, 'portfolio');
    };

    const handleVignetteClick = async (vignette: VignetteData) => {
        const imageName = getImageNameFromUrl(vignette.public_url);
        console.log(`[Chat Page] Vignette clicked: ${vignette.brand_name}, image: ${imageName}`);

        // Disable auto-scroll for vignette responses using sessionStorage
        // This persists across navigation to the new conversation page
        sessionStorage.setItem('disableAutoScroll', 'true');
        if (disableAutoScrollRef) {
            disableAutoScrollRef.current = true;
        }
        console.log('[Chat Page] Auto-scroll DISABLED for vignette response (set in sessionStorage)');

        try {
            const response = await fetch(`/api/vignettes/markdown?markdown=${encodeURIComponent(imageName)}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch markdown: ${response.status}`);
            }
            const data = await response.json();
            console.log(`[Chat Page] Markdown data received:`, data);

            if (data.text) {
                handleSend(data.text);
                // Note: sessionStorage flag will be cleared by the hook after navigation
            }
        } catch (error) {
            console.error("[Chat Page] Error fetching vignette markdown:", error);
            toast.error("Failed to load vignette details");

            // Re-enable auto-scroll on error
            sessionStorage.removeItem('disableAutoScroll');
            if (disableAutoScrollRef) {
                disableAutoScrollRef.current = false;
            }
            console.log('[Chat Page] Auto-scroll RE-ENABLED after error');
        }
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
                                    ? "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/logo_text_blanc.svg"
                                    : "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/logo_text.svg"
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

    if (!session) {
        return null;
    }

    // Determine if we're showing the welcome screen or conversation view
    const isWelcomeScreen = !conversationId;

    return (
        <>
            {/* Header */}
            <header className={`relative z-10 bg-[rgba(247,240,232,0.8)] dark:bg-black backdrop-blur-md border-b border-gray-300 dark:border-gray-800 pl-14 pr-6 md:px-6 ${isWelcomeScreen ? 'h-[52px] sm:h-[60px]' : 'py-3 sm:py-4'} flex items-center justify-between`}>
                <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <Link href="/" className="cursor-pointer">
                            <Image
                                src={
                                    mounted && isDark
                                        ? "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/logo_text_blanc.svg"
                                        : "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/logo_text.svg"
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
                <div className={`relative flex-1 bg-[rgb(247,240,232)] dark:bg-[rgb(1,1,0)] px-6 ${vignettes.length > 0 ? 'overflow-hidden' : 'overflow-y-auto'}`}>
                    <div className={`w-full max-w-4xl flex flex-col items-center py-10 mx-auto ${vignettes.length === 0 && !vignetteLoading && !vignetteError ? 'min-h-full justify-center' : ''}`}>
                        {vignettes.length > 0 ? (
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
                                                ? "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/flavicon_white.svg"
                                                : "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/flavicon_new.svg"
                                        }
                                        alt="Prophetic Orchestra"
                                        width={80}
                                        height={80}
                                        className="w-full h-full object-contain"
                                    />
                                </div>

                                {/* Greeting */}
                                <h1 className="text-3xl sm:text-4xl font-medium text-gray-900 dark:text-white mb-3">
                                    {t('chat.greeting').replace('{name}', session?.user?.name?.split(' ')[0] || '')}
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
                                    onPortfolioClick={handlePortfolioClick}
                                    userStatus={(session?.user as { status?: string })?.status as 'unauthorized' | 'free' | 'paid' | 'admini' | 'discover' | 'intelligence' | 'oracle' | undefined}
                                    selectedAgent={selectedAgent}
                                    onAgentChange={setSelectedAgent}
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
                                />
                            ))}

                            {/* Typing indicator */}
                            {isLoading && !streamingMessage && !streamingMarketplaceData && !streamingVignetteData && (
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
                                streamingVignetteData) && (
                                    <div className="flex gap-2 sm:gap-4 items-start justify-start">
                                        <AIAvatar />
                                        <div className="max-w-[90vw] sm:max-w-3xl lg:max-w-4xl px-3 sm:px-4 py-4 sm:py-5 rounded-2xl overflow-hidden bg-[rgb(247,240,232)] dark:bg-[rgb(1,1,0)] text-gray-900 dark:text-white">
                                            {streamingMessage && (
                                                <Markdown
                                                    content={streamingMessage}
                                                    className="text-base"
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
                                                        <VignetteGridCard data={streamingVignetteData} />
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
                            onPortfolioClick={handlePortfolioClick}
                            userStatus={(session?.user as { status?: string })?.status as 'unauthorized' | 'free' | 'paid' | 'admini' | 'discover' | 'intelligence' | 'oracle' | undefined}
                            selectedAgent={selectedAgent}
                            onAgentChange={setSelectedAgent}
                            className="max-w-3xl"
                        />
                    </div>
                </>
            )}
        </>
    );
}
