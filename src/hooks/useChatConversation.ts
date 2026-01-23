import { useState, useRef, useEffect, useCallback } from "react";
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
import { ClothesSearchData } from "@/components/ClothesSearchCard";

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
    clothes_search_data?: ClothesSearchData;
    vignetteCategory?: string; // Category enum value when displaying vignette markdown
}

interface PendingMessage {
    content: string;
    flashCards?: string;
    flashCardType?: 'flash_invest' | 'ranking' | 'portfolio';
    scrollToTop?: boolean;
}

interface UseChatConversationProps {
    conversationId: number | null;
    selectedModel?: string;
}

const PENDING_MESSAGE_KEY = 'pendingChatMessage';
const PENDING_VIGNETTE_CONTENT_KEY = 'pendingVignetteContent';
const PENDING_VIGNETTE_STREAM_KEY = 'pendingVignetteStream';
const PENDING_SCROLL_TO_TOP_KEY = 'pendingScrollToTop';

interface PendingVignetteStream {
    imageName: string;
    category: string;
}

export function useChatConversation({ conversationId, selectedModel = "anthropic/claude-3.7-sonnet" }: UseChatConversationProps) {
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [streamingMessage, setStreamingMessage] = useState("");
    const [streamingMarketplaceData, setStreamingMarketplaceData] = useState<MarketplaceData | null>(null);
    const [streamingRealEstateData, setStreamingRealEstateData] = useState<RealEstateData | null>(null);
    const [streamingVignetteData, setStreamingVignetteData] = useState<VignetteData[] | null>(null);
    const [streamingClothesSearchData, setStreamingClothesSearchData] = useState<ClothesSearchData | null>(null);
    const [streamingVignetteCategory, setStreamingVignetteCategory] = useState<string | null>(null);
    const [currentStatus, setCurrentStatus] = useState("");
    const [lastStreamingActivity, setLastStreamingActivity] = useState<number>(0);
    const [showStreamingIndicator, setShowStreamingIndicator] = useState(false);
    const [lastUserMessageId, setLastUserMessageId] = useState<number | null>(null);
    const [shouldScrollToTop, setShouldScrollToTop] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
    const disableAutoScrollRef = useRef(false);
    const pendingMessageProcessedRef = useRef(false);

    // Function to send message to API and handle streaming
    const sendMessageToApi = useCallback(async (
        targetConversationId: number,
        userInput: string,
        flashCards?: string,
        flashCardType?: 'flash_invest' | 'ranking' | 'portfolio',
        scrollToTop: boolean = false
    ) => {
        setIsLoading(true);
        setStreamingMessage("");
        setStreamingMarketplaceData(null);
        setStreamingRealEstateData(null);
        setStreamingVignetteData(null);
        setStreamingClothesSearchData(null);
        setCurrentStatus("");
        setLastStreamingActivity(Date.now());
        setShowStreamingIndicator(false);

        // Add user message to UI immediately
        const tempUserMessage: Message = {
            id: Date.now(),
            content: userInput,
            sender: "user",
            created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, tempUserMessage]);

        if (scrollToTop) {
            setLastUserMessageId(tempUserMessage.id);
            setShouldScrollToTop(true);
            disableAutoScrollRef.current = true;
            sessionStorage.setItem('disableAutoScroll', 'true');
        }

        try {
            const response = await fetch(`/api/conversations/${targetConversationId}/messages`, {
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
                                    await loadConversation(targetConversationId);
                                    setStreamingMessage("");
                                    setStreamingMarketplaceData(null);
                                    setStreamingRealEstateData(null);
                                    setStreamingVignetteData(null);
                                    setStreamingClothesSearchData(null);
                                    setCurrentStatus("");
                                } catch (err) {
                                    console.error("Error reloading conversation:", err);
                                    setStreamingMessage("");
                                    setStreamingMarketplaceData(null);
                                    setStreamingRealEstateData(null);
                                    setStreamingVignetteData(null);
                                    setStreamingClothesSearchData(null);
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
                        } else if (data.type === "vignette_data") {
                            const vignetteData = data.data;
                            if (vignetteData) {
                                setStreamingVignetteData(vignetteData);
                            }
                        } else if (data.type === "clothes_data") {
                            // Handle clothes search response
                            const clothesData = data.data;
                            if (clothesData && clothesData.listings) {
                                setStreamingClothesSearchData(clothesData);
                            }
                        } else if (data.type === "metadata") {
                            if (data.skip_streaming && data.intro) {
                                streamContent += data.intro + "\n\n";
                                setStreamingMessage(streamContent);
                            }
                        } else if (data.type === "done") {
                            try {
                                await loadConversation(targetConversationId);
                                setStreamingMessage("");
                                setStreamingMarketplaceData(null);
                                setStreamingRealEstateData(null);
                                setStreamingVignetteData(null);
                                setStreamingClothesSearchData(null);
                                setCurrentStatus("");
                            } catch (err) {
                                console.error("Error reloading conversation:", err);
                                setStreamingMessage("");
                                setStreamingMarketplaceData(null);
                                setStreamingRealEstateData(null);
                                setStreamingVignetteData(null);
                                setStreamingClothesSearchData(null);
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
    }, []);

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

    // Load conversation and check for pending messages when conversationId changes
    useEffect(() => {
        console.log('[useEffect] Running with conversationId:', conversationId, 'pendingMessageProcessedRef:', pendingMessageProcessedRef.current);

        if (conversationId) {
            // Check for pending user message first
            const pendingMessageStr = sessionStorage.getItem(PENDING_MESSAGE_KEY);
            console.log('[useEffect] PENDING_MESSAGE_KEY:', pendingMessageStr ? 'found' : 'not found');
            if (pendingMessageStr && !pendingMessageProcessedRef.current) {
                pendingMessageProcessedRef.current = true;
                sessionStorage.removeItem(PENDING_MESSAGE_KEY);

                try {
                    const pendingMessage: PendingMessage = JSON.parse(pendingMessageStr);
                    // Send the pending message - this will add user message to UI and handle streaming
                    sendMessageToApi(
                        conversationId,
                        pendingMessage.content,
                        pendingMessage.flashCards,
                        pendingMessage.flashCardType,
                        pendingMessage.scrollToTop
                    );
                } catch (error) {
                    console.error("Error parsing pending message:", error);
                    // Fall back to loading conversation normally
                    loadConversation(conversationId);
                }
                return;
            }

            // Check for pending vignette content (AI message)
            const pendingVignetteContent = sessionStorage.getItem(PENDING_VIGNETTE_CONTENT_KEY);
            console.log('[useEffect] PENDING_VIGNETTE_CONTENT_KEY:', pendingVignetteContent ? `found (${pendingVignetteContent.length} chars)` : 'not found');
            console.log('[useEffect] pendingMessageProcessedRef.current:', pendingMessageProcessedRef.current);
            if (pendingVignetteContent && !pendingMessageProcessedRef.current) {
                console.log('[useEffect] Processing pending vignette content');
                pendingMessageProcessedRef.current = true;
                sessionStorage.removeItem(PENDING_VIGNETTE_CONTENT_KEY);

                // Helper function to save vignette messages to database
                const saveVignetteMessages = async (messagesToSave: { content: string; vignetteCategory?: string }[]) => {
                    try {
                        const response = await fetch(`/api/conversations/${conversationId}/vignette-content`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ messages: messagesToSave }),
                        });
                        if (!response.ok) {
                            console.error('[useEffect] Failed to save vignette messages to database');
                        } else {
                            console.log('[useEffect] Vignette messages saved to database');
                        }
                    } catch (error) {
                        console.error('[useEffect] Error saving vignette messages:', error);
                    }
                };

                // Check if the content is JSON with text and questions fields
                try {
                    const parsed = JSON.parse(pendingVignetteContent);
                    if (parsed.text) {
                        const messages: Message[] = [
                            {
                                id: Date.now(),
                                content: parsed.text,
                                sender: "ai",
                                created_at: new Date().toISOString(),
                            }
                        ];
                        const messagesToSave: { content: string; vignetteCategory?: string }[] = [
                            { content: parsed.text, vignetteCategory: parsed.vignetteCategory }
                        ];
                        // If there are questions, add them as a second message
                        if (parsed.questions) {
                            messages.push({
                                id: Date.now() + 1,
                                content: parsed.questions,
                                sender: "ai",
                                created_at: new Date().toISOString(),
                            });
                            messagesToSave.push({ content: parsed.questions, vignetteCategory: parsed.vignetteCategory });
                        }
                        setMessages(messages);
                        // Save to database in background
                        saveVignetteMessages(messagesToSave);
                        return;
                    }
                } catch {
                    // Not JSON, treat as plain text content
                }

                // Add the vignette content as an AI message (plain text)
                const aiMessage: Message = {
                    id: Date.now(),
                    content: pendingVignetteContent,
                    sender: "ai",
                    created_at: new Date().toISOString(),
                };
                setMessages([aiMessage]);
                // Save to database in background
                saveVignetteMessages([{ content: pendingVignetteContent }]);
                return;
            }

            // Check for pending vignette stream (will be handled by separate useEffect)
            const pendingVignetteStreamStr = sessionStorage.getItem(PENDING_VIGNETTE_STREAM_KEY);
            if (pendingVignetteStreamStr) {
                // Skip loading - the stream useEffect will handle this
                return;
            }

            // No pending content - load conversation normally
            console.log('[useEffect] No pending content found, loading conversation from DB');
            loadConversation(conversationId);
        } else {
            console.log('[useEffect] No conversationId, resetting state');
            setMessages([]);
            pendingMessageProcessedRef.current = false;
        }

        // Check sessionStorage for disable auto-scroll flag
        const shouldDisableScroll = sessionStorage.getItem('disableAutoScroll') === 'true';
        if (shouldDisableScroll) {
            disableAutoScrollRef.current = true;
            console.log('[Auto-scroll] Initialized from sessionStorage - auto-scroll DISABLED');

            // Clear the flag after a delay - increased to 30s to allow for long responses
            setTimeout(() => {
                sessionStorage.removeItem('disableAutoScroll');
                disableAutoScrollRef.current = false;
                console.log('[Auto-scroll] Cleared sessionStorage flag - auto-scroll RE-ENABLED');
            }, 30000);
        }

        // Check for pending scroll to top
        const pendingScrollToTop = sessionStorage.getItem(PENDING_SCROLL_TO_TOP_KEY) === 'true';
        if (pendingScrollToTop) {
            setShouldScrollToTop(true);
            sessionStorage.removeItem(PENDING_SCROLL_TO_TOP_KEY);
        }

        // Check for pending scroll to top specifically for vignettes
        const pendingVignetteScroll = sessionStorage.getItem('pendingScrollToTopVignette') === 'true';
        if (pendingVignetteScroll) {
            console.log('[Auto-scroll] Pending vignette scroll detected');
            if (messagesContainerRef.current) {
                messagesContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
            }
            sessionStorage.removeItem('pendingScrollToTopVignette');
        }
    }, [conversationId, sendMessageToApi]);


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

        // Handle specific scroll to top request
        if (shouldScrollToTop && lastUserMessageId && messagesContainerRef.current) {
            const container = messagesContainerRef.current;
            const element = container.querySelector(`[data-message-id="${lastUserMessageId}"]`) as HTMLElement;

            if (element) {
                console.log(`[Auto-scroll] Precise scroll to top for message ${lastUserMessageId}`);

                // Calculate position: element's offset relative to container's top
                // This ensures it goes to the VERY top of the viewport
                const targetTop = element.offsetTop;

                container.scrollTo({
                    top: targetTop,
                    behavior: 'smooth'
                });

                // Keep trying for 2 seconds to handle any dynamic layout shifts
                const interval = setInterval(() => {
                    if (container && element) {
                        container.scrollTo({ top: element.offsetTop, behavior: 'smooth' });
                    }
                }, 400);

                const timer = setTimeout(() => {
                    clearInterval(interval);
                    setShouldScrollToTop(false);
                }, 2000);

                return () => {
                    clearInterval(interval);
                    clearTimeout(timer);
                };
            }
        }

        // Standard auto-scroll to bottom
        if (shouldAutoScroll && !hasVignetteData && !disableAutoScrollRef.current) {
            scrollToBottom();
        }
    }, [messages, streamingMessage, streamingMarketplaceData, streamingRealEstateData, streamingVignetteData, streamingClothesSearchData, isLoading, shouldAutoScroll, shouldScrollToTop, lastUserMessageId]);

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

    const refreshConversations = () => {
        window.dispatchEvent(new Event("refreshConversations"));
    };

    const handleSend = async (messageToSend?: string, flashCards?: string, flashCardType?: 'flash_invest' | 'ranking' | 'portfolio', scrollToTop: boolean = false) => {
        const userInput = messageToSend || input;
        if (!userInput.trim() || isLoading) return;

        setInput("");

        // If we already have a conversation, send directly
        if (conversationId) {
            await sendMessageToApi(conversationId, userInput, flashCards, flashCardType, scrollToTop);
            return;
        }

        // No conversation yet - create one and navigate immediately
        setIsLoading(true);

        const messageId = Date.now();
        // Show user message immediately on welcome screen
        const tempUserMessage: Message = {
            id: messageId,
            content: userInput,
            sender: "user",
            created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, tempUserMessage]);

        if (scrollToTop) {
            setLastUserMessageId(messageId);
            setShouldScrollToTop(true);
            sessionStorage.setItem(PENDING_SCROLL_TO_TOP_KEY, 'true');
        }

        try {
            const title = userInput.length > 50 ? userInput.substring(0, 50) + "..." : userInput;

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

            // Store pending message in sessionStorage for the new page to pick up
            const pendingMessage: PendingMessage = {
                content: userInput,
                flashCards,
                flashCardType,
                scrollToTop
            };
            sessionStorage.setItem(PENDING_MESSAGE_KEY, JSON.stringify(pendingMessage));

            // Refresh conversations list in sidebar
            refreshConversations();

            // Navigate immediately - the new page will pick up the pending message
            router.push(`/chat/${newConversationId}`);
        } catch (error) {
            console.error("Error creating conversation:", error);
            setIsLoading(false);
        }
        // Note: setIsLoading(false) is NOT called here on success
        // because navigation will unmount this component
    };

    const handleFlashcardClick = (flashCards: string, question: string, flashCardType: 'flash_invest' | 'ranking' | 'portfolio', displayName: string) => {
        // Disable auto-scroll for flash_invest and ranking responses (they return markdown content)
        if (flashCardType === 'flash_invest' || flashCardType === 'ranking') {
            sessionStorage.setItem('disableAutoScroll', 'true');
            disableAutoScrollRef.current = true;
            console.log(`[Auto-scroll] Disabled for ${flashCardType} response`);
        }
        // Use displayName for the visible user message instead of the internal question/category identifier
        handleSend(displayName, flashCards, flashCardType, true);
    };

    const addAiMessage = async (content: string) => {
        const aiMessage: Message = {
            id: Date.now(),
            content,
            sender: "ai",
            created_at: new Date().toISOString(),
        };

        // If we have a conversation or in dev mode, just add the message locally
        if (conversationId || process.env.NEXT_PUBLIC_SKIP_AUTH === "true") {
            setMessages((prev) => [...prev, aiMessage]);
            return;
        }

        // No conversation - create one and navigate with the vignette content
        try {
            const title = content.length > 50 ? content.substring(0, 50) + "..." : content;

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

            // Store the vignette content as JSON for the new page to display and persist
            sessionStorage.setItem(PENDING_VIGNETTE_CONTENT_KEY, JSON.stringify({ text: content }));

            // Refresh conversations list in sidebar
            refreshConversations();

            // Navigate to the new conversation
            router.push(`/chat/${newConversationId}`);
        } catch (error) {
            console.error("Error creating conversation for vignette:", error);
        }
    };

    // Stream vignette markdown content progressively
    const streamVignetteMarkdown = useCallback(async (imageName: string, category?: string): Promise<boolean> => {
        setIsLoading(true);
        setStreamingMessage("");
        setStreamingVignetteCategory(category || null);

        try {
            let markdownUrl = `/api/vignettes/markdown?markdown=${encodeURIComponent(imageName)}`;
            if (category) {
                markdownUrl += `&category=${encodeURIComponent(category)}`;
            }
            const response = await fetch(markdownUrl);

            if (!response.ok) {
                throw new Error(`Failed to fetch markdown: ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error("No response stream");
            }

            const decoder = new TextDecoder();
            let documentContent = "";
            let questionsContent = "";
            let buffer = "";
            let chunkCount = 0;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunkCount++;

                buffer += decoder.decode(value, { stream: true });

                // Check if the response is plain JSON (not SSE format)
                if (chunkCount === 1 && buffer.trim().startsWith('{')) {
                    // Try to parse as plain JSON
                    try {
                        const jsonResponse = JSON.parse(buffer);
                        if (jsonResponse.text) {
                            documentContent = jsonResponse.text;
                            setStreamingMessage(documentContent);

                            // Add the main text as the first AI message
                            const aiMessage: Message = {
                                id: Date.now(),
                                content: documentContent,
                                sender: "ai",
                                created_at: new Date().toISOString(),
                                vignetteCategory: category,
                            };

                            // Helper to save messages to database
                            const saveVignetteToDb = async (convId: number, msgs: { content: string; vignetteCategory?: string }[]) => {
                                try {
                                    const response = await fetch(`/api/conversations/${convId}/vignette-content`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ messages: msgs }),
                                    });
                                    if (!response.ok) {
                                        console.error('[Vignette] Failed to save to database');
                                    } else {
                                        console.log('[Vignette] Messages saved to database');
                                    }
                                } catch (error) {
                                    console.error('[Vignette] Error saving to database:', error);
                                }
                            };

                            // Build messages array
                            const questionsMessage = jsonResponse.questions ? {
                                id: Date.now() + 1,
                                content: jsonResponse.questions,
                                sender: "ai" as const,
                                created_at: new Date().toISOString(),
                                vignetteCategory: category,
                            } : null;

                            if (conversationId) {
                                // Existing conversation - add messages and save to DB
                                if (questionsMessage) {
                                    setMessages((prev) => [...prev, aiMessage, questionsMessage]);
                                } else {
                                    setMessages((prev) => [...prev, aiMessage]);
                                }
                                // Save to database
                                const messagesToSave = [{ content: documentContent, vignetteCategory: category }];
                                if (jsonResponse.questions) {
                                    messagesToSave.push({ content: jsonResponse.questions, vignetteCategory: category });
                                }
                                saveVignetteToDb(conversationId, messagesToSave);
                            } else if (process.env.NEXT_PUBLIC_SKIP_AUTH === "true") {
                                // Dev mode without conversation - just display locally
                                if (questionsMessage) {
                                    setMessages((prev) => [...prev, aiMessage, questionsMessage]);
                                } else {
                                    setMessages((prev) => [...prev, aiMessage]);
                                }
                            } else {
                                // No conversation - create one and save messages
                                const title = documentContent.length > 50
                                    ? documentContent.substring(0, 50) + "..."
                                    : documentContent;

                                try {
                                    const createResponse = await fetch("/api/conversations", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                            title: title,
                                            model: selectedModel,
                                        }),
                                    });

                                    if (createResponse.ok) {
                                        const data = await createResponse.json();
                                        const newConversationId = data.conversation.id;

                                        // Save messages to database
                                        const messagesToSave = [{ content: documentContent, vignetteCategory: category }];
                                        if (jsonResponse.questions) {
                                            messagesToSave.push({ content: jsonResponse.questions, vignetteCategory: category });
                                        }
                                        await saveVignetteToDb(newConversationId, messagesToSave);

                                        // Refresh sidebar and navigate
                                        refreshConversations();
                                        router.push(`/chat/${newConversationId}`);
                                    } else {
                                        // Failed to create conversation - just display locally
                                        if (questionsMessage) {
                                            setMessages((prev) => [...prev, aiMessage, questionsMessage]);
                                        } else {
                                            setMessages((prev) => [...prev, aiMessage]);
                                        }
                                    }
                                } catch (error) {
                                    console.error('[Vignette] Error creating conversation:', error);
                                    // Display locally on error
                                    if (questionsMessage) {
                                        setMessages((prev) => [...prev, aiMessage, questionsMessage]);
                                    } else {
                                        setMessages((prev) => [...prev, aiMessage]);
                                    }
                                }
                            }
                            setStreamingMessage("");
                            setCurrentStatus("");
                            setIsLoading(false);
                            return true;
                        }
                    } catch {
                        // Not valid JSON yet, continue reading
                    }
                }

                // Split by double newline to get complete SSE events
                const events = buffer.split("\n\n");
                buffer = events.pop() || "";

                for (const event of events) {
                    if (!event.trim()) continue;

                    // Extract data from SSE event
                    const lines = event.split("\n");
                    let eventData = "";

                    for (const line of lines) {
                        if (line.startsWith("data: ")) {
                            eventData += line.slice(6);
                        }
                    }

                    if (!eventData || eventData === "[DONE]") {
                        continue;
                    }

                    try {
                        const parsed = JSON.parse(eventData);

                        if (parsed.type === "document") {
                            console.log(`[Vignette Stream] DOCUMENT received at ${new Date().toISOString()} (${parsed.content?.length || 0} chars)`);
                            documentContent = parsed.content || "";
                            // Show document immediately
                            setStreamingMessage(documentContent);
                            // Yield to allow React to re-render before processing more events
                            await new Promise(resolve => setTimeout(resolve, 0));
                        } else if (parsed.type === "status") {
                            console.log(`[Vignette Stream] STATUS: ${parsed.message} at ${new Date().toISOString()}`);
                            setCurrentStatus(parsed.message || "");
                        } else if (parsed.type === "questions_chunk") {
                            console.log(`[Vignette Stream] QUESTIONS_CHUNK received at ${new Date().toISOString()} (+${parsed.content?.length || 0} chars)`);
                            questionsContent += parsed.content || "";
                            // Update with document + questions as they stream
                            const fullContent = documentContent + "\n\n" + questionsContent;
                            setStreamingMessage(fullContent);
                        } else if (parsed.type === "done") {
                            console.log(`[Vignette Stream] DONE received at ${new Date().toISOString()}`);
                            // Finalize
                            const finalContent = questionsContent
                                ? `${documentContent}\n\n${questionsContent}`
                                : documentContent;

                            // Add as a message
                            const aiMessage: Message = {
                                id: Date.now(),
                                content: finalContent,
                                sender: "ai",
                                created_at: new Date().toISOString(),
                                vignetteCategory: category,
                            };

                            // Helper to save to database
                            const saveToDb = async (convId: number) => {
                                try {
                                    const response = await fetch(`/api/conversations/${convId}/vignette-content`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ messages: [{ content: finalContent, vignetteCategory: category }] }),
                                    });
                                    if (!response.ok) {
                                        console.error('[Vignette SSE] Failed to save to database');
                                    } else {
                                        console.log('[Vignette SSE] Message saved to database');
                                    }
                                } catch (error) {
                                    console.error('[Vignette SSE] Error saving to database:', error);
                                }
                            };

                            if (conversationId) {
                                // Existing conversation - add and save
                                setMessages((prev) => [...prev, aiMessage]);
                                saveToDb(conversationId);
                            } else if (process.env.NEXT_PUBLIC_SKIP_AUTH === "true") {
                                // Dev mode - just display locally
                                setMessages((prev) => [...prev, aiMessage]);
                            } else {
                                // No conversation - create one and save
                                const title = finalContent.length > 50
                                    ? finalContent.substring(0, 50) + "..."
                                    : finalContent;

                                try {
                                    const createResponse = await fetch("/api/conversations", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                            title: title,
                                            model: selectedModel,
                                        }),
                                    });

                                    if (createResponse.ok) {
                                        const data = await createResponse.json();
                                        const newConversationId = data.conversation.id;
                                        await saveToDb(newConversationId);
                                        refreshConversations();
                                        router.push(`/chat/${newConversationId}`);
                                    } else {
                                        // Failed - just display locally
                                        setMessages((prev) => [...prev, aiMessage]);
                                    }
                                } catch (error) {
                                    console.error('[Vignette SSE] Error creating conversation:', error);
                                    setMessages((prev) => [...prev, aiMessage]);
                                }
                            }
                            setStreamingMessage("");
                            setCurrentStatus("");
                        }
                    } catch (parseError) {
                        console.error("[Vignette Stream] Failed to parse SSE event:", eventData);
                    }
                }
            }

            // Handle remaining buffer content (e.g., plain JSON that wasn't processed)
            if (buffer.trim()) {
                try {
                    const jsonResponse = JSON.parse(buffer);
                    if (jsonResponse.text && !documentContent) {
                        documentContent = jsonResponse.text;
                        setStreamingMessage(documentContent);

                        // Add the main text as the first AI message
                        const aiMessage: Message = {
                            id: Date.now(),
                            content: documentContent,
                            sender: "ai",
                            created_at: new Date().toISOString(),
                            vignetteCategory: category,
                        };

                        const questionsMessage = jsonResponse.questions ? {
                            id: Date.now() + 1,
                            content: jsonResponse.questions,
                            sender: "ai" as const,
                            created_at: new Date().toISOString(),
                            vignetteCategory: category,
                        } : null;

                        // Helper to save to database
                        const saveBufferToDb = async (convId: number) => {
                            try {
                                const msgs = [{ content: documentContent, vignetteCategory: category }];
                                if (jsonResponse.questions) {
                                    msgs.push({ content: jsonResponse.questions, vignetteCategory: category });
                                }
                                const response = await fetch(`/api/conversations/${convId}/vignette-content`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ messages: msgs }),
                                });
                                if (!response.ok) {
                                    console.error('[Vignette Buffer] Failed to save to database');
                                }
                            } catch (error) {
                                console.error('[Vignette Buffer] Error saving to database:', error);
                            }
                        };

                        if (conversationId) {
                            // Existing conversation - add and save
                            if (questionsMessage) {
                                setMessages((prev) => [...prev, aiMessage, questionsMessage]);
                            } else {
                                setMessages((prev) => [...prev, aiMessage]);
                            }
                            saveBufferToDb(conversationId);
                        } else if (process.env.NEXT_PUBLIC_SKIP_AUTH === "true") {
                            // Dev mode - just display locally
                            if (questionsMessage) {
                                setMessages((prev) => [...prev, aiMessage, questionsMessage]);
                            } else {
                                setMessages((prev) => [...prev, aiMessage]);
                            }
                        } else {
                            // No conversation - create one and save
                            const title = documentContent.length > 50
                                ? documentContent.substring(0, 50) + "..."
                                : documentContent;

                            try {
                                const createResponse = await fetch("/api/conversations", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                        title: title,
                                        model: selectedModel,
                                    }),
                                });

                                if (createResponse.ok) {
                                    const data = await createResponse.json();
                                    const newConversationId = data.conversation.id;
                                    await saveBufferToDb(newConversationId);
                                    refreshConversations();
                                    router.push(`/chat/${newConversationId}`);
                                } else {
                                    // Failed - just display locally
                                    if (questionsMessage) {
                                        setMessages((prev) => [...prev, aiMessage, questionsMessage]);
                                    } else {
                                        setMessages((prev) => [...prev, aiMessage]);
                                    }
                                }
                            } catch (error) {
                                console.error('[Vignette Buffer] Error creating conversation:', error);
                                if (questionsMessage) {
                                    setMessages((prev) => [...prev, aiMessage, questionsMessage]);
                                } else {
                                    setMessages((prev) => [...prev, aiMessage]);
                                }
                            }
                        }
                        setStreamingMessage("");
                        setCurrentStatus("");
                    }
                } catch {
                    // Remaining buffer is not valid JSON
                }
            }

            setIsLoading(false);
            return true;
        } catch (error) {
            console.error("[Vignette Stream] Error:", error);
            setIsLoading(false);
            setStreamingMessage("");
            setCurrentStatus("");
            return false;
        }
    }, [conversationId, selectedModel, router]);

    // Stream vignette with chunk-based format (for ART_TRADING_VALUE with prompt_markdown=True)
    const streamVignetteChunks = useCallback(async (imageName: string, category: string): Promise<boolean> => {
        setIsLoading(true);
        setStreamingMessage("");
        setStreamingVignetteCategory(category);
        setLastStreamingActivity(Date.now());

        try {
            const markdownUrl = `/api/vignettes/markdown?markdown=${encodeURIComponent(imageName)}&category=${encodeURIComponent(category)}`;
            const response = await fetch(markdownUrl);

            if (!response.ok) {
                throw new Error(`Failed to fetch markdown: ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error("No response stream");
            }

            const decoder = new TextDecoder();
            let streamContent = "";
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // Split by newlines to get individual JSON objects
                const lines = buffer.split("\n");
                buffer = lines.pop() || ""; // Keep incomplete line in buffer

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine) continue;

                    // Handle SSE format (data: prefix)
                    let jsonStr = trimmedLine;
                    if (trimmedLine.startsWith("data: ")) {
                        jsonStr = trimmedLine.slice(6);
                    }

                    if (jsonStr === "[DONE]") continue;

                    try {
                        const data = JSON.parse(jsonStr);

                        if (data.type === "chunk") {
                            streamContent += data.content || "";
                            setStreamingMessage(streamContent);
                            setLastStreamingActivity(Date.now());
                        } else if (data.type === "done") {
                            // Finalize the message
                            const aiMessage: Message = {
                                id: Date.now(),
                                content: streamContent,
                                sender: "ai",
                                created_at: new Date().toISOString(),
                                vignetteCategory: category,
                            };

                            // Helper to save to database
                            const saveChunkToDb = async (convId: number) => {
                                try {
                                    const response = await fetch(`/api/conversations/${convId}/vignette-content`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ messages: [{ content: streamContent, vignetteCategory: category }] }),
                                    });
                                    if (!response.ok) {
                                        console.error('[Vignette Chunks] Failed to save to database');
                                    }
                                } catch (error) {
                                    console.error('[Vignette Chunks] Error saving to database:', error);
                                }
                            };

                            if (conversationId) {
                                // Existing conversation - add and save
                                setMessages((prev) => [...prev, aiMessage]);
                                saveChunkToDb(conversationId);
                            } else if (process.env.NEXT_PUBLIC_SKIP_AUTH === "true") {
                                // Dev mode - just display locally
                                setMessages((prev) => [...prev, aiMessage]);
                            } else {
                                // No conversation - create one and save
                                const title = streamContent.length > 50
                                    ? streamContent.substring(0, 50) + "..."
                                    : streamContent;

                                try {
                                    const createResponse = await fetch("/api/conversations", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                            title: title,
                                            model: selectedModel,
                                        }),
                                    });

                                    if (createResponse.ok) {
                                        const data2 = await createResponse.json();
                                        const newConversationId = data2.conversation.id;
                                        await saveChunkToDb(newConversationId);
                                        refreshConversations();
                                        router.push(`/chat/${newConversationId}`);
                                    } else {
                                        setMessages((prev) => [...prev, aiMessage]);
                                    }
                                } catch (error) {
                                    console.error('[Vignette Chunks] Error creating conversation:', error);
                                    setMessages((prev) => [...prev, aiMessage]);
                                }
                            }
                            setStreamingMessage("");
                            setCurrentStatus("");
                        }
                    } catch (parseError) {
                        console.error("[Vignette Chunks] Failed to parse:", jsonStr);
                    }
                }
            }

            // Handle any remaining buffer and finalize if we haven't received a done event
            if (buffer.trim()) {
                try {
                    let jsonStr = buffer.trim();
                    if (jsonStr.startsWith("data: ")) {
                        jsonStr = jsonStr.slice(6);
                    }
                    if (jsonStr && jsonStr !== "[DONE]") {
                        const data = JSON.parse(jsonStr);
                        if (data.type === "chunk") {
                            streamContent += data.content || "";
                        }
                    }
                } catch {
                    // Ignore parse errors on remaining buffer
                }
            }

            // If we have content but no done event was received, finalize anyway
            if (streamContent && !messages.some(m => m.content === streamContent)) {
                const aiMessage: Message = {
                    id: Date.now(),
                    content: streamContent,
                    sender: "ai",
                    created_at: new Date().toISOString(),
                    vignetteCategory: category,
                };

                // Helper to save to database
                const saveFallbackToDb = async (convId: number) => {
                    try {
                        const response = await fetch(`/api/conversations/${convId}/vignette-content`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ messages: [{ content: streamContent, vignetteCategory: category }] }),
                        });
                        if (!response.ok) {
                            console.error('[Vignette Chunks Fallback] Failed to save to database');
                        }
                    } catch (error) {
                        console.error('[Vignette Chunks Fallback] Error saving to database:', error);
                    }
                };

                if (conversationId) {
                    setMessages((prev) => [...prev, aiMessage]);
                    saveFallbackToDb(conversationId);
                } else if (process.env.NEXT_PUBLIC_SKIP_AUTH === "true") {
                    setMessages((prev) => [...prev, aiMessage]);
                } else {
                    // No conversation - create one and save
                    const title = streamContent.length > 50
                        ? streamContent.substring(0, 50) + "..."
                        : streamContent;

                    try {
                        const createResponse = await fetch("/api/conversations", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                title: title,
                                model: selectedModel,
                            }),
                        });

                        if (createResponse.ok) {
                            const data = await createResponse.json();
                            const newConversationId = data.conversation.id;
                            await saveFallbackToDb(newConversationId);
                            refreshConversations();
                            router.push(`/chat/${newConversationId}`);
                        } else {
                            setMessages((prev) => [...prev, aiMessage]);
                        }
                    } catch (error) {
                        console.error('[Vignette Chunks Fallback] Error creating conversation:', error);
                        setMessages((prev) => [...prev, aiMessage]);
                    }
                }
                setStreamingMessage("");
            }

            setIsLoading(false);
            return true;
        } catch (error) {
            console.error("[Vignette Chunks] Error:", error);
            setIsLoading(false);
            setStreamingMessage("");
            setCurrentStatus("");
            return false;
        }
    }, [messages, conversationId, selectedModel, router, refreshConversations]);

    // Handle pending vignette stream (ART_TRADING_VALUE chunk-based streaming)
    // This useEffect must be after streamVignetteChunks is defined
    useEffect(() => {
        if (!conversationId) return;

        const pendingVignetteStreamStr = sessionStorage.getItem(PENDING_VIGNETTE_STREAM_KEY);
        if (pendingVignetteStreamStr && !pendingMessageProcessedRef.current) {
            pendingMessageProcessedRef.current = true;
            sessionStorage.removeItem(PENDING_VIGNETTE_STREAM_KEY);

            try {
                const pendingStream: PendingVignetteStream = JSON.parse(pendingVignetteStreamStr);
                // Start streaming the vignette chunks
                streamVignetteChunks(pendingStream.imageName, pendingStream.category);
            } catch (error) {
                console.error("Error parsing pending vignette stream:", error);
            }
        }
    }, [conversationId, streamVignetteChunks]);

    // Stable clearMessages function
    const clearMessages = useCallback(() => {
        setMessages([]);
        setStreamingMessage("");
        setStreamingMarketplaceData(null);
        setStreamingRealEstateData(null);
        setStreamingVignetteData(null);
        setStreamingClothesSearchData(null);
        setStreamingVignetteCategory(null);
        setCurrentStatus("");
        setShowStreamingIndicator(false);
    }, []);

    return {
        // State
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

        // Refs
        messagesEndRef,
        messagesContainerRef,
        disableAutoScrollRef,

        // Functions
        lastUserMessageId,
        shouldScrollToTop,
        setShouldScrollToTop,
        handleSend,
        handleFlashcardClick,
        handleScroll,
        addAiMessage,
        streamVignetteMarkdown,
        streamVignetteChunks,
        clearMessages,
    };
}
