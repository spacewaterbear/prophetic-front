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

interface PendingMessage {
    content: string;
    flashCards?: string;
    flashCardType?: 'flash_invest' | 'ranking' | 'portfolio';
}

interface UseChatConversationProps {
    conversationId: number | null;
    selectedModel?: string;
}

const PENDING_MESSAGE_KEY = 'pendingChatMessage';
const PENDING_VIGNETTE_CONTENT_KEY = 'pendingVignetteContent';

export function useChatConversation({ conversationId, selectedModel = "anthropic/claude-3.7-sonnet" }: UseChatConversationProps) {
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [streamingMessage, setStreamingMessage] = useState("");
    const [streamingMarketplaceData, setStreamingMarketplaceData] = useState<MarketplaceData | null>(null);
    const [streamingRealEstateData, setStreamingRealEstateData] = useState<RealEstateData | null>(null);
    const [streamingVignetteData, setStreamingVignetteData] = useState<VignetteData[] | null>(null);
    const [currentStatus, setCurrentStatus] = useState("");
    const [lastStreamingActivity, setLastStreamingActivity] = useState<number>(0);
    const [showStreamingIndicator, setShowStreamingIndicator] = useState(false);

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
        flashCardType?: 'flash_invest' | 'ranking' | 'portfolio'
    ) => {
        setIsLoading(true);
        setStreamingMessage("");
        setStreamingMarketplaceData(null);
        setStreamingRealEstateData(null);
        setStreamingVignetteData(null);
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
                                    setCurrentStatus("");
                                } catch (err) {
                                    console.error("Error reloading conversation:", err);
                                    setStreamingMessage("");
                                    setStreamingMarketplaceData(null);
                                    setStreamingRealEstateData(null);
                                    setStreamingVignetteData(null);
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
                                setCurrentStatus("");
                            } catch (err) {
                                console.error("Error reloading conversation:", err);
                                setStreamingMessage("");
                                setStreamingMarketplaceData(null);
                                setStreamingRealEstateData(null);
                                setStreamingVignetteData(null);
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
        if (conversationId) {
            // Check for pending user message first
            const pendingMessageStr = sessionStorage.getItem(PENDING_MESSAGE_KEY);
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
                        pendingMessage.flashCardType
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
            if (pendingVignetteContent && !pendingMessageProcessedRef.current) {
                pendingMessageProcessedRef.current = true;
                sessionStorage.removeItem(PENDING_VIGNETTE_CONTENT_KEY);

                // Add the vignette content as an AI message
                const aiMessage: Message = {
                    id: Date.now(),
                    content: pendingVignetteContent,
                    sender: "ai",
                    created_at: new Date().toISOString(),
                };
                setMessages([aiMessage]);
                return;
            }

            // No pending content - load conversation normally
            loadConversation(conversationId);
        } else {
            setMessages([]);
            pendingMessageProcessedRef.current = false;
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
            }, 10000);
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

        // Don't auto-scroll if vignette data is present or if explicitly disabled
        if (shouldAutoScroll && !hasVignetteData && !disableAutoScrollRef.current) {
            scrollToBottom();
        }
    }, [messages, streamingMessage, streamingMarketplaceData, streamingRealEstateData, streamingVignetteData, isLoading, shouldAutoScroll]);

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

    const handleSend = async (messageToSend?: string, flashCards?: string, flashCardType?: 'flash_invest' | 'ranking' | 'portfolio') => {
        const userInput = messageToSend || input;
        if (!userInput.trim() || isLoading) return;

        setInput("");

        // If we already have a conversation, send directly
        if (conversationId) {
            await sendMessageToApi(conversationId, userInput, flashCards, flashCardType);
            return;
        }

        // No conversation yet - create one and navigate immediately
        setIsLoading(true);

        // Show user message immediately on welcome screen
        const tempUserMessage: Message = {
            id: Date.now(),
            content: userInput,
            sender: "user",
            created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, tempUserMessage]);

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
                flashCardType
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

    const handleFlashcardClick = (flashCards: string, question: string, flashCardType: 'flash_invest' | 'ranking' | 'portfolio') => {
        // Disable auto-scroll for flash_invest and ranking responses (they return markdown content)
        if (flashCardType === 'flash_invest' || flashCardType === 'ranking') {
            sessionStorage.setItem('disableAutoScroll', 'true');
            disableAutoScrollRef.current = true;
            console.log(`[Auto-scroll] Disabled for ${flashCardType} response`);
        }
        handleSend(question, flashCards, flashCardType);
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

            // Store the vignette content for the new page to display
            sessionStorage.setItem(PENDING_VIGNETTE_CONTENT_KEY, content);

            // Refresh conversations list in sidebar
            refreshConversations();

            // Navigate to the new conversation
            router.push(`/chat/${newConversationId}`);
        } catch (error) {
            console.error("Error creating conversation for vignette:", error);
        }
    };

    // Stream vignette markdown content progressively
    const streamVignetteMarkdown = useCallback(async (imageName: string): Promise<boolean> => {
        setIsLoading(true);
        setStreamingMessage("");

        try {
            const response = await fetch(`/api/vignettes/markdown?markdown=${encodeURIComponent(imageName)}`);

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

                            // Add as a message
                            const aiMessage: Message = {
                                id: Date.now(),
                                content: documentContent,
                                sender: "ai",
                                created_at: new Date().toISOString(),
                            };

                            if (conversationId || process.env.NEXT_PUBLIC_SKIP_AUTH === "true") {
                                setMessages((prev) => [...prev, aiMessage]);
                                setStreamingMessage("");
                                setCurrentStatus("");
                            }
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
                            };

                            // If in a conversation, add the message locally
                            if (conversationId || process.env.NEXT_PUBLIC_SKIP_AUTH === "true") {
                                setMessages((prev) => [...prev, aiMessage]);
                                setStreamingMessage("");
                                setCurrentStatus("");
                            } else {
                                // No conversation - create one and navigate
                                const title = finalContent.length > 50
                                    ? finalContent.substring(0, 50) + "..."
                                    : finalContent;

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
                                    sessionStorage.setItem(PENDING_VIGNETTE_CONTENT_KEY, finalContent);
                                    refreshConversations();
                                    router.push(`/chat/${newConversationId}`);
                                }
                                setStreamingMessage("");
                                setCurrentStatus("");
                            }
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

                        // Add as a message
                        const aiMessage: Message = {
                            id: Date.now(),
                            content: documentContent,
                            sender: "ai",
                            created_at: new Date().toISOString(),
                        };

                        if (conversationId || process.env.NEXT_PUBLIC_SKIP_AUTH === "true") {
                            setMessages((prev) => [...prev, aiMessage]);
                            setStreamingMessage("");
                            setCurrentStatus("");
                        }
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

    // Stable clearMessages function
    const clearMessages = useCallback(() => {
        setMessages([]);
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
        addAiMessage,
        streamVignetteMarkdown,
        clearMessages,
    };
}
