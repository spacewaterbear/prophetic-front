import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

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

import { VignetteData } from "@/types/vignettes";

export interface Message {
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
    vignette_data?: VignetteData[];
}

interface UseChatConversationProps {
    conversationId: number | null;
    selectedModel?: string;
}

export function useChatConversation({ conversationId, selectedModel = "anthropic/claude-3.7-sonnet" }: UseChatConversationProps) {
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [streamingMessage, setStreamingMessage] = useState("");
    const [streamingMarketplaceData, setStreamingMarketplaceData] = useState<MarketplaceData | null>(null);
    const [streamingRealEstateData, setStreamingRealEstateData] = useState<RealEstateData | null>(null);
    const [currentStatus, setCurrentStatus] = useState("");
    const [lastStreamingActivity, setLastStreamingActivity] = useState<number>(0);
    const [showStreamingIndicator, setShowStreamingIndicator] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
    const disableAutoScrollRef = useRef(false);

    // Load conversation when conversationId changes
    useEffect(() => {
        if (conversationId) {
            loadConversation(conversationId);
        } else {
            setMessages([]);
        }

        // Check sessionStorage for disable auto-scroll flag
        const shouldDisableScroll = sessionStorage.getItem('disableAutoScroll') === 'true';
        if (shouldDisableScroll) {
            disableAutoScrollRef.current = true;
            console.log('[Auto-scroll] Initialized from sessionStorage - auto-scroll DISABLED');

            // Clear the flag after a delay
            setTimeout(() => {
                sessionStorage.removeItem('disableAutoScroll');
                disableAutoScrollRef.current = false;
                console.log('[Auto-scroll] Cleared sessionStorage flag - auto-scroll RE-ENABLED');
            }, 10000); // 10 seconds should be enough for the response to load
        }
    }, [conversationId]);


    // Auto-scroll logic
    const scrollToBottom = () => {
        // Don't scroll if explicitly disabled
        if (disableAutoScrollRef.current) {
            console.log('[Auto-scroll] Scroll prevented - disableAutoScrollRef is true');
            return;
        }
        console.log('[Auto-scroll] Scrolling to bottom');
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleScroll = () => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const isNearBottom =
            container.scrollHeight - container.scrollTop - container.clientHeight < 20;
        setShouldAutoScroll(isNearBottom);
    };

    useEffect(() => {
        // Check if the last message contains vignette data
        const lastMessage = messages[messages.length - 1];
        const hasVignetteData = lastMessage?.vignette_data && lastMessage.vignette_data.length > 0;

        // Don't auto-scroll if vignette data is present or if explicitly disabled
        if (shouldAutoScroll && !hasVignetteData && !disableAutoScrollRef.current) {
            scrollToBottom();
        }
    }, [messages, streamingMessage, streamingMarketplaceData, streamingRealEstateData, isLoading, shouldAutoScroll]);

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
            } else if (response.status === 404) {
                console.error("Conversation not found, redirecting to home");
                router.push("/");
            }
        } catch (error) {
            console.error("Error loading conversation:", error);
            router.push("/");
        }
    };

    const refreshConversations = () => {
        window.dispatchEvent(new Event("refreshConversations"));
    };

    const handleSend = async (messageToSend?: string, flashCards?: string, flashCardType?: 'flash_invest' | 'ranking' | 'portfolio') => {
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

            // If no conversation ID, create new conversation and redirect
            if (!activeConversationId) {
                const title = userInput.length > 50 ? userInput.substring(0, 50) + "..." : userInput;

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
            const response = await fetch(`/api/conversations/${activeConversationId}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: userInput,
                    flash_cards: flashCards,
                    flash_card_type: flashCardType
                }),
            });

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

    const handleFlashcardClick = (flashCards: string, question: string, flashCardType: 'flash_invest' | 'ranking' | 'portfolio') => {
        handleSend(question, flashCards, flashCardType);
    };

    return {
        // State
        messages,
        input,
        setInput,
        isLoading,
        streamingMessage,
        streamingMarketplaceData,
        streamingRealEstateData,
        currentStatus,
        showStreamingIndicator,

        // Refs
        messagesEndRef,
        messagesContainerRef,
        disableAutoScrollRef,

        // Functions
        handleSend,
        handleFlashcardClick,
        handleScroll,
    };
}
