"use client";

import { Button } from "@/components/ui/button";
import {
    Check,
    Copy,
    Menu,
} from "lucide-react";
import Image from "next/image";
import { lazy, memo, Suspense, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useTheme } from "next-themes";
import { ModelSelector } from "@/components/ModelSelector";
import { DEFAULT_NON_ADMIN_MODEL } from "@/lib/models";
import { TypingIndicator } from "@/components/TypingIndicator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ShareButton } from "@/components/ShareButton";
import { toast } from "sonner";
import { useI18n } from "@/contexts/i18n-context";
import { ChatInput } from "@/components/ChatInput";

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

interface Artist {
    artist_name: string;
    artist_picture_url: string | null;
    primary_country: string | null;
    country_iso_code: string | null;
    total_artworks: number | null;
    ratio_sold?: number;
    social_score?: number;
}

interface MarketplaceData {
    found: boolean;
    marketplace: string;
    artist_profile?: {
        name: string;
        url: string;
        artwork_count?: number;
    } | null;
    artworks?: Array<{
        title: string;
        price: string;
        url: string;
        image_url?: string;
    }>;
    total_artworks?: number;
    error_message?: string | null;
    search_metadata?: Record<string, unknown>;
}

interface RealEstateData {
    found: boolean;
    marketplace: string;
    location: string;
    location_slug?: string;
    properties: Array<{
        title: string;
        price: string;
        price_amount: number;
        price_currency: string;
        url: string;
        image_url: string;
        bedrooms?: number;
        bathrooms?: number;
        square_meters?: number;
        square_feet?: number;
        property_type: string;
        listing_id?: string;
    }>;
    total_properties: number;
    search_url?: string;
    filters_applied?: Record<string, unknown>;
    error_message?: string | null;
}

interface Message {
    id: number;
    content: string;
    sender: "user" | "ai";
    created_at: string;
    type?: string;
    message?: string;
    research_type?: string;
    artist?: Artist;
    has_existing_data?: boolean;
    text?: string;
    streaming_text?: string;
    marketplace_data?: MarketplaceData;
    marketplace_position?: "before" | "after";
    real_estate_data?: RealEstateData;
}

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
            <div
                className={`flex gap-2 sm:gap-4 items-start justify-start w-full`}
            >
                {message.sender === "ai" && <AIAvatar />}
                {message.sender === "user" && (
                    <div className="hidden sm:flex w-8 h-8 sm:w-10 sm:h-10 mt-1 rounded-full bg-gray-800 dark:bg-white/10 items-center justify-center text-white dark:text-white font-medium flex-shrink-0 leading-none text-base sm:text-lg">
                        {userName}
                    </div>
                )}
                <div className={`group flex flex-col gap-2 ${message.sender === "ai" ? "w-full" : ""}`}>
                    <div
                        className={`py-4 sm:py-5 rounded-2xl overflow-hidden ${message.sender === "user"
                            ? "bg-[rgb(230,220,210)] dark:bg-gray-700 text-gray-900 dark:text-white max-w-[90vw] sm:max-w-3xl lg:max-w-4xl px-3 sm:px-4"
                            : "bg-[rgb(247,240,232)] dark:bg-[rgb(1,1,0)] text-gray-900 dark:text-white max-w-[90vw] sm:max-w-3xl lg:max-w-4xl px-3 sm:px-4"
                            }`}
                    >
                        {message.sender === "user" ? (
                            <p className="text-base leading-relaxed whitespace-pre-wrap">
                                {message.content}
                            </p>
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
const isAdminUser = (
    session: { user?: { status?: string } } | null,
): boolean => {
    return session?.user?.status === "admini";
};

// Helper function to refresh conversations in parent layout
const refreshConversations = () => {
    window.dispatchEvent(new Event("refreshConversations"));
};

export default function ChatPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams();
    const conversationId = params.conversationId ? parseInt(params.conversationId as string, 10) : null;
    const { theme, resolvedTheme } = useTheme();
    const isDark = theme === "dark" || resolvedTheme === "dark";
    const { t } = useI18n();

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [streamingMessage, setStreamingMessage] = useState("");
    const [streamingMarketplaceData, setStreamingMarketplaceData] =
        useState<MarketplaceData | null>(null);
    const [streamingRealEstateData, setStreamingRealEstateData] =
        useState<RealEstateData | null>(null);
    const [currentStatus, setCurrentStatus] = useState("");
    const [selectedModel, setSelectedModel] = useState<string>(
        DEFAULT_NON_ADMIN_MODEL,
    );
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [lastStreamingActivity, setLastStreamingActivity] = useState<number>(0);
    const [showStreamingIndicator, setShowStreamingIndicator] = useState(false);

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

    // Load conversation from URL parameter
    // Load conversation from URL parameter
    useEffect(() => {
        if (conversationId && session?.user) {
            loadConversation(conversationId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversationId, session]);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Auto-scroll logic
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleScroll = () => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const isNearBottom =
            container.scrollHeight - container.scrollTop - container.clientHeight <
            20;
        setShouldAutoScroll(isNearBottom);
    };

    useEffect(() => {
        if (shouldAutoScroll) {
            scrollToBottom();
        }
    }, [
        messages,
        streamingMessage,
        streamingMarketplaceData,
        streamingRealEstateData,
        isLoading,
        shouldAutoScroll,
    ]);

    // Streaming indicator logic
    useEffect(() => {
        if (!isLoading) {
            setShowStreamingIndicator(false);
            return;
        }

        const interval = setInterval(() => {
            const now = Date.now();
            const timeSinceLastActivity = now - lastStreamingActivity;

            if (isLoading && streamingMessage && timeSinceLastActivity > 500) {
                setShowStreamingIndicator(true);
            } else {
                setShowStreamingIndicator(false);
            }
        }, 300);

        return () => clearInterval(interval);
    }, [isLoading, streamingMessage, lastStreamingActivity]);

    const loadConversation = async (id: number) => {
        try {
            const response = await fetch(`/api/conversations/${id}`);
            if (response.ok) {
                const data = await response.json();
                setMessages(data.messages || []);
                if (data.conversation?.model) {
                    setSelectedModel(data.conversation.model);
                }
            } else if (response.status === 404) {
                console.error("Conversation not found, redirecting to home");
                router.push("/");
            }
        } catch (error) {
            console.error("Error loading conversation:", error);
            router.push("/");
        }
    };

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

    const handleSend = async (messageToSend?: string, flashCards?: string, flashCardType?: 'flash_invest' | 'ranking') => {
        const userInput = messageToSend || input;
        if (!userInput.trim() || isLoading) return;

        setInput("");
        setIsLoading(true);
        setStreamingMessage("");
        setStreamingMarketplaceData(null);
        setStreamingRealEstateData(null);
        setCurrentStatus("");
        setLastStreamingActivity(Date.now());
        setShowStreamingIndicator(false);

        const tempUserMessage: Message = {
            id: Date.now(),
            content: userInput,
            sender: "user",
            created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, tempUserMessage]);

        try {
            let activeConversationId = conversationId;

            // If no conversation ID in URL, create new conversation and redirect
            if (!activeConversationId) {
                const title =
                    userInput.length > 50
                        ? userInput.substring(0, 50) + "..."
                        : userInput;

                const response = await fetch("/api/conversations", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title: title,
                        model: selectedModel,
                    }),
                });

                if (response.ok) {
                    const data = await response.json();
                    activeConversationId = data.conversation.id;
                    // Redirect to the new conversation URL
                    router.push(`/chat/${activeConversationId}`);
                    // Refresh conversations list in sidebar
                    refreshConversations();
                }
            }

            if (!activeConversationId) {
                throw new Error("Failed to create conversation");
            }

            // Send message with streaming
            const response = await fetch(
                `/api/conversations/${activeConversationId}/messages`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        content: userInput,
                        flash_cards: flashCards,
                        flash_card_type: flashCardType
                    }),
                },
            );

            if (!response.ok) {
                throw new Error("Failed to send message");
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) {
                throw new Error("No response stream");
            }

            let streamContent = "";

            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split("\n").filter((line) => line.trim());

                for (const line of lines) {
                    let cleanedLine = line;
                    if (line.startsWith("data: ")) {
                        cleanedLine = line.slice(6);
                    }

                    try {
                        const data = JSON.parse(cleanedLine);

                        if (data.type === "chunk") {
                            streamContent += data.content;
                            setStreamingMessage(streamContent);
                            setLastStreamingActivity(Date.now());
                            setCurrentStatus("");
                        } else if (data.type === "artist_info") {
                            if (data.userMessage || data.aiMessage) {
                                try {
                                    await loadConversation(activeConversationId!);
                                    setStreamingMessage("");
                                    setStreamingMarketplaceData(null);
                                    setStreamingRealEstateData(null);
                                    setCurrentStatus("");
                                } catch (err) {
                                    console.error("Error reloading conversation:", err);
                                    setStreamingMessage("");
                                    setStreamingMarketplaceData(null);
                                    setStreamingRealEstateData(null);
                                }
                                continue;
                            }
                        } else if (data.type === "marketplace_data") {
                            const marketplaceData = data.data;
                            if (marketplaceData) {
                                setStreamingMarketplaceData(marketplaceData);
                            }
                        } else if (data.type === "real_estate_data") {
                            const realEstateData = data.data;
                            if (realEstateData) {
                                setStreamingRealEstateData(realEstateData);
                            }
                        } else if (data.type === "metadata") {
                            if (data.skip_streaming && data.intro) {
                                streamContent += data.intro + "\n\n";
                                setStreamingMessage(streamContent);
                            }
                        } else if (data.type === "done") {
                            try {
                                await loadConversation(activeConversationId!);
                                setStreamingMessage("");
                                setStreamingMarketplaceData(null);
                                setStreamingRealEstateData(null);
                                setCurrentStatus("");
                            } catch (err) {
                                console.error("Error reloading conversation:", err);
                                setStreamingMessage("");
                                setStreamingMarketplaceData(null);
                                setStreamingRealEstateData(null);
                                setCurrentStatus("");
                            }
                        } else if (data.type === "status") {
                            setCurrentStatus(data.message);
                            setLastStreamingActivity(Date.now());
                        } else if (data.type === "error") {
                            console.error("Stream error:", data.error);
                        }
                    } catch (error) {
                        console.error("Error parsing chunk:", error);
                    }
                }
            }
        } catch (error) {
            console.error("Error sending message:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFlashcardClick = (flashCards: string, question: string, flashCardType: 'flash_invest' | 'ranking') => {
        handleSend(question, flashCards, flashCardType);
    };

    return (
        <>
            {/* Header */}
            <header className="bg-[rgba(247,240,232,0.8)] dark:bg-black backdrop-blur-md border-b border-gray-300 dark:border-gray-800 px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <Image
                            src={
                                mounted && isDark
                                    ? "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/logo_text_blanc.svg"
                                    : "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/logo_text.svg"
                            }
                            alt="Prophetic Orchestra"
                            width={180}
                            height={45}
                            className="h-7 sm:h-10 w-auto"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    {isAdminUser(session) && (
                        <ModelSelector
                            selectedModel={selectedModel}
                            onModelChange={handleModelChange}
                            disabled={isLoading}
                        />
                    )}
                    <button
                        className="h-9 w-9 flex items-center justify-center rounded-md hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                        aria-label="Chrono"
                    >
                        <Image
                            src={
                                mounted && isDark
                                    ? "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/chrono_b.svg"
                                    : "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/chrono.svg"
                            }
                            alt="Chrono"
                            width={24}
                            height={24}
                            className="h-5 w-5"
                        />
                    </button>
                    <ThemeToggle />
                    <ShareButton
                        conversationId={conversationId}
                        disabled={isLoading}
                    />
                </div>
            </header>

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
                    {isLoading && !streamingMessage && !streamingMarketplaceData && (
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
                        streamingRealEstateData) && (
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
            <div className="input-area px-3 sm:px-6 py-3 sm:py-4 bg-[rgb(247,240,232)] dark:bg-black">
                <ChatInput
                    input={input}
                    setInput={setInput}
                    handleSend={() => handleSend()}
                    isLoading={isLoading}
                    onFlashcardClick={handleFlashcardClick}
                />
            </div>
        </>
    );
}
