"use client";

import {Button} from "@/components/ui/button";
import {Card} from "@/components/ui/card";
import {Check, Copy, LogOut, Menu, MessageSquare, Plus, Send, X} from "lucide-react";
import Image from "next/image";
import {lazy, memo, Suspense, useEffect, useRef, useState} from "react";
import {signOut, useSession} from "next-auth/react";
import {useRouter} from "next/navigation";
import {ModelSelector} from "@/components/ModelSelector";
import {TypingIndicator} from "@/components/TypingIndicator";
import {ThemeToggle} from "@/components/ThemeToggle";
import {ShareButton} from "@/components/ShareButton";
import {toast} from "sonner";

// Lazy load Markdown component to reduce initial bundle size
const Markdown = lazy(() => import("@/components/Markdown").then(mod => ({default: mod.Markdown})));
const ArtistCard = lazy(() => import("@/components/ArtistCard").then(mod => ({default: mod.ArtistCard})));

interface Artist {
    artist_name: string;
    artist_picture_url: string | null;
    primary_country: string | null;
    country_iso_code: string | null;
    total_artworks: number | null;
    ratio_sold?: number; // Float between 0 and 1
    social_score?: number; // Float between 0 and 1
}

interface Message {
    id: number;
    content: string;
    sender: "user" | "ai";
    created_at: string;
    // Optional structured data fields
    type?: string;
    message?: string;
    research_type?: string;
    artist?: Artist;
    has_existing_data?: boolean;
    text?: string;
    streaming_text?: string;
}

interface Conversation {
    id: number;
    title: string | null;
    model: string | null;
    created_at: string | null;
    updated_at: string | null;
}

// Reusable AI Avatar component to prevent duplicate image loads
const AIAvatar = memo(() => (
    <div
        className="w-8 h-8 sm:w-10 sm:h-10 mt-1 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
        <Image
            src="https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/flavicon.png"
            alt="Prophetic Orchestra"
            width={40}
            height={40}
            className="w-full h-full object-cover"
            priority
        />
    </div>
));

AIAvatar.displayName = "AIAvatar";

// Memoized message component to prevent unnecessary re-renders
const MessageItem = memo(({message, userName}: { message: Message; userName: string }) => {
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
            className={`flex gap-2 sm:gap-4 items-start ${message.sender === "user" ? "justify-end" : "justify-start"}`}
        >
            {message.sender === "ai" && <AIAvatar/>}
            <div className="group relative">
                <div
                    className={`max-w-[90vw] sm:max-w-3xl lg:max-w-4xl pl-4 pr-12 py-4 sm:pl-8 sm:pr-14 sm:py-5 rounded-2xl ${
                        message.sender === "user"
                            ? "bg-custom-brand text-white"
                            : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                    }`}
                >
                    {message.sender === "user" ? (
                        <p className="text-base leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    ) : message.type === "artist_info" && message.artist ? (
                        <Suspense fallback={<div className="text-base text-gray-400">Loading...</div>}>
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
                        <Suspense fallback={<div className="text-base text-gray-400">Loading...</div>}>
                            <Markdown content={message.content} className="text-base"/>
                        </Suspense>
                    )}
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopy}
                    className={`absolute bottom-2 right-2 h-7 w-7 sm:h-8 sm:w-8 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity ${
                        message.sender === "user"
                            ? "text-white hover:bg-white/20"
                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                    aria-label="Copy message"
                >
                    {copied ? <Check className="h-3 w-3 sm:h-4 sm:w-4"/> : <Copy className="h-3 w-3 sm:h-4 sm:w-4"/>}
                </Button>
            </div>
            {message.sender === "user" && (
                <div
                    className="w-8 h-8 sm:w-10 sm:h-10 mt-1 rounded-full bg-custom-brand flex items-center justify-center text-white font-medium flex-shrink-0 leading-none text-base sm:text-lg">
                    {userName}
                </div>
            )}
        </div>
    );
});

MessageItem.displayName = "MessageItem";

// Example prompts - moved outside component to prevent recreation on every render
const examplePrompts = [
    "Propose me an investment portfolio for $150K",
    "What watches should I buy with a $50K investment?",
    "Which NFTs are worth buying with a $50K budget?",
    "tell me what you know about Jean-Michel Basquiat"
];

export default function Home() {
    const {data: session, status} = useSession();
    const router = useRouter();

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [sidebarOpen, setSidebarOpen] = useState(() => {
        // Default to closed on mobile, open on desktop
        if (typeof window !== 'undefined') {
            return window.innerWidth >= 768; // Tailwind's md breakpoint
        }
        return false; // Default to closed for SSR
    });
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [streamingMessage, setStreamingMessage] = useState("");
    const [selectedModel, setSelectedModel] = useState<string>("anthropic/claude-3.7-sonnet");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

    // Redirect to login if not authenticated or to registration-pending if unauthorized
    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } else if (status === "authenticated" && (session?.user as any)?.status === 'unauthorized') {
            router.push("/registration-pending");
        }
    }, [status, session, router]);

    // Load conversations on mount
    useEffect(() => {
        if (session?.user) {
            loadConversations();
        }
    }, [session]);

    // Handle responsive sidebar behavior
    useEffect(() => {
        const handleResize = () => {
            const isDesktop = window.innerWidth >= 768;
            setSidebarOpen(isDesktop);
        };

        // Add resize listener
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Auto-scroll to bottom when messages change or streaming updates
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Detect user scroll to determine if auto-scroll should be enabled
    const handleScroll = () => {
        const container = messagesContainerRef.current;
        if (!container) return;

        // Check if user is near the bottom (within 20px threshold)
        // This makes it very sensitive - any small scroll up will disable auto-scroll
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 20;
        setShouldAutoScroll(isNearBottom);
    };

    useEffect(() => {
        if (shouldAutoScroll) {
            scrollToBottom();
        }
    }, [messages, streamingMessage, isLoading, shouldAutoScroll]);

    const loadConversations = async () => {
        try {
            const response = await fetch("/api/conversations");
            if (response.ok) {
                const data = await response.json();
                setConversations(data.conversations || []);
            } else {
                console.error("Failed to load conversations:", response.status);
            }
        } catch (error) {
            console.error("Error loading conversations:", error);
        }
    };

    const loadConversation = async (conversationId: number) => {
        try {
            const response = await fetch(`/api/conversations/${conversationId}`);
            if (response.ok) {
                const data = await response.json();
                setMessages(data.messages || []);
                setCurrentConversationId(conversationId);
                // Update selected model from conversation
                if (data.conversation?.model) {
                    setSelectedModel(data.conversation.model);
                }
            }
        } catch (error) {
            console.error("Error loading conversation:", error);
        }
    };

    const createNewConversation = () => {
        // Just clear the current chat state
        // The conversation will be created in the database when the first message is sent
        setCurrentConversationId(null);
        setMessages([]);
        setStreamingMessage("");
    };

    const deleteConversation = async (conversationId: number, e: React.MouseEvent) => {
        // Prevent the click from triggering the conversation load
        e.stopPropagation();

        try {
            const response = await fetch(`/api/conversations/${conversationId}`, {
                method: "DELETE",
            });

            if (response.ok) {
                // Remove the conversation from the list
                setConversations(prev => prev.filter(c => c.id !== conversationId));

                // If we deleted the current conversation, clear the chat
                if (currentConversationId === conversationId) {
                    setCurrentConversationId(null);
                    setMessages([]);
                    setStreamingMessage("");
                }
            } else {
                console.error("Failed to delete conversation:", response.status);
            }
        } catch (error) {
            console.error("Error deleting conversation:", error);
        }
    };

    const handleSignOut = async () => {
        await signOut({callbackUrl: "/login"});
    };

    const handleModelChange = async (newModel: string) => {
        setSelectedModel(newModel);

        // Update the current conversation's model if there is one
        if (currentConversationId) {
            try {
                await fetch(`/api/conversations/${currentConversationId}`, {
                    method: "PATCH",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({model: newModel}),
                });
            } catch (error) {
                console.error("Error updating conversation model:", error);
            }
        }
    };

    // Show loading while checking authentication
    if (status === "loading") {
        return (
            <div
                className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
                <div className="text-center">
                    <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center animate-pulse">
                        <Image
                            src="https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/logo_prophetic_v2.png"
                            alt="Prophetic Orchestra"
                            width={128}
                            height={128}
                            className="w-full h-full object-contain"
                        />
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    // Don't render if not authenticated
    if (!session) {
        return null;
    }

    const handleSend = async (messageToSend?: string) => {
        const userInput = messageToSend || input;
        if (!userInput.trim() || isLoading) return;

        setInput("");
        setIsLoading(true);
        setStreamingMessage("");

        // Add user message to UI immediately
        const tempUserMessage: Message = {
            id: Date.now(), // Temporary ID
            content: userInput,
            sender: "user",
            created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, tempUserMessage]);

        try {
            // Create conversation if needed
            let conversationId = currentConversationId;
            if (!conversationId) {
                // Generate title from user's question (first 50 chars)
                const title = userInput.length > 50
                    ? userInput.substring(0, 50) + "..."
                    : userInput;

                const response = await fetch("/api/conversations", {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({
                        title: title,
                        model: selectedModel
                    }),
                });

                if (response.ok) {
                    const data = await response.json();
                    conversationId = data.conversation.id;
                    setCurrentConversationId(conversationId);
                    await loadConversations();
                }
            }

            if (!conversationId) {
                throw new Error("Failed to create conversation");
            }

            // Send message with streaming
            const response = await fetch(`/api/conversations/${conversationId}/messages`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({content: userInput}),
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
                const {done, value} = await reader.read();

                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split("\n").filter(line => line.trim());

                for (const line of lines) {
                    // Strip "data: " prefix if present (defensive SSE parsing)
                    let cleanedLine = line;
                    if (line.startsWith("data: ")) {
                        cleanedLine = line.slice(6); // Remove "data: " (6 characters)
                    }

                    try {
                        const data = JSON.parse(cleanedLine);

                        if (data.type === "chunk") {
                            streamContent += data.content;
                            setStreamingMessage(streamContent);
                        } else if (data.type === "artist_info") {
                            // Handle structured artist info response
                            // Check if this is a "done" message (has userMessage/aiMessage) or actual artist data
                            if (data.userMessage || data.aiMessage) {
                                // This is a completion message, treat it as "done"
                                await loadConversation(conversationId);
                                setStreamingMessage("");
                                continue;
                            }

                            // Extract the nested data object from backend
                            const artistData = data.data;

                            // Defensive check: ensure artistData exists
                            if (!artistData) {
                                console.error("[Artist Info] Missing nested data, skipping:", data);
                                continue;
                            }

                            // Create a temporary message with the artist info for immediate display
                            const artistMessage: Message = {
                                id: Date.now(), // Temporary ID until we reload from database
                                content: artistData.message || "",
                                sender: "ai",
                                created_at: new Date().toISOString(),
                                type: "artist_info",
                                message: artistData.message,
                                research_type: artistData.research_type,
                                artist: artistData.artist,
                                has_existing_data: artistData.has_existing_data,
                                text: artistData.text,
                                streaming_text: artistData.streaming_text
                            };

                            // Add the artist message to display immediately
                            setMessages(prev => [...prev, artistMessage]);
                            setStreamingMessage("");

                            // No reload needed - message is already complete and displayable
                            // The backend has already saved it, and we have all the data we need
                        } else if (data.type === "metadata") {
                            // Handle metadata messages (e.g., intro text with skip_streaming flag)
                            if (data.skip_streaming && data.intro) {
                                // If skip_streaming is true, add the intro text immediately
                                streamContent += data.intro + "\n\n";
                                setStreamingMessage(streamContent);
                            }
                            // If skip_streaming is false, the intro will be streamed as chunks
                        } else if (data.type === "done") {
                            // Optimistically add the AI message if provided in the event
                            if (data.aiMessage) {
                                setMessages(prev => [...prev, data.aiMessage]);
                            }

                            // Clear streaming message
                            setStreamingMessage("");

                            // Reload conversation as backup to ensure consistency
                            // This happens in background and won't block UI update
                            loadConversation(conversationId).catch(err =>
                                console.error("Error reloading conversation:", err)
                            );
                        } else if (data.type === "error") {
                            console.error("Stream error:", data.error);
                        }
                    } catch (error) {
                        console.error("Error parsing chunk:", error);
                        console.error("Raw line:", line);
                        console.error("Cleaned line:", cleanedLine);
                    }
                }
            }
        } catch (error) {
            console.error("Error sending message:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
            {/* Mobile overlay/backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar */}
            <aside
                className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 bg-gray-900 dark:bg-black text-white flex flex-col overflow-hidden fixed md:relative h-full z-50 md:z-auto`}>
                <div className="p-4 border-b border-gray-700 dark:border-gray-800">
                    <Button
                        className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg"
                        onClick={createNewConversation}
                        disabled={isLoading}
                    >
                        <Plus className="h-4 w-4 mr-2"/>
                        New Chat
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-2">
                        <div className="text-xs text-gray-400 mb-2">Recent Chats</div>
                        {conversations.length === 0 ? (
                            <div className="text-xs text-gray-500 px-3 py-2">No conversations yet</div>
                        ) : (
                            conversations.map((conversation) => (
                                <div key={conversation.id} className="relative group">
                                    <button
                                        onClick={() => loadConversation(conversation.id)}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${
                                            currentConversationId === conversation.id
                                                ? "bg-white/20 border border-white/30 shadow-sm"
                                                : "hover:bg-white/10 border border-transparent"
                                        }`}
                                    >
                                        <MessageSquare className={`h-4 w-4 flex-shrink-0 ${
                                            currentConversationId === conversation.id ? "text-blue-400" : ""
                                        }`}/>
                                        <span className={`truncate ${
                                            currentConversationId === conversation.id ? "font-medium" : ""
                                        }`}>{conversation.title}</span>
                                    </button>
                                    <button
                                        onClick={(e) => deleteConversation(conversation.id, e)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400"
                                        aria-label="Delete conversation"
                                    >
                                        <X className="h-4 w-4"/>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-gray-700 dark:border-gray-800 space-y-2">
                    {session?.user && (
                        <div className="px-3 py-2 rounded-lg bg-white/5 mb-2">
                            <div className="flex items-center gap-2">
                                {session.user.image && (
                                    <Image
                                        src={session.user.image}
                                        alt={session.user.name || "User"}
                                        width={32}
                                        height={32}
                                        className="rounded-full"
                                    />
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{session.user.name}</p>
                                    <p className="text-xs text-gray-400 truncate">{session.user.email}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={handleSignOut}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-500/10 text-sm transition-colors flex items-center gap-2 text-red-400 hover:text-red-300"
                    >
                        <LogOut className="h-4 w-4"/>
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <header
                    className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="flex-shrink-0 h-9 w-9 sm:h-10 sm:w-10"
                        >
                            <Menu className="h-5 w-5"/>
                        </Button>
                        <div className="flex items-center gap-3 min-w-0">
                            <Image
                                src="https://ext.same-assets.com/4250389560/3143870090.png"
                                alt="Prophetic Orchestra"
                                width={180}
                                height={45}
                                className="h-7 sm:h-10 w-auto"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        <ModelSelector
                            selectedModel={selectedModel}
                            onModelChange={handleModelChange}
                            disabled={isLoading}
                        />
                        <ThemeToggle/>
                        <ShareButton
                            conversationId={currentConversationId}
                            disabled={isLoading}
                        />
                    </div>
                </header>

                {/* Messages */}
                <div
                    ref={messagesContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-8"
                >
                    {messages.length === 0 && !streamingMessage && (
                        <div className="max-w-4xl mx-auto mb-8 sm:mb-12">
                            <div className="text-center mb-8 sm:mb-12">
                                <div
                                    className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center overflow-hidden">
                                    <Image
                                        src="https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/flavicon.png"
                                        alt="Prophetic Orchestra"
                                        width={80}
                                        height={80}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <h2 className="text-2xl sm:text-4xl font-light mb-3 sm:mb-4 dark:text-white px-4">Secure
                                    the advantage in nine luxury segments</h2>
                                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 px-4">Powered by
                                    Score Orchestra™ and TTT Token technology</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                                {examplePrompts.map((prompt, i) => (
                                    <Card
                                        key={i}
                                        className="p-3 sm:p-4 hover:shadow-lg transition-shadow cursor-pointer border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                                        onClick={() => handleSend(prompt)}
                                    >
                                        <p className="text-sm text-gray-700 dark:text-gray-300 text-center">{prompt}</p>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="max-w-5xl mx-auto space-y-6 md:pr-32 lg:pr-40">
                        {messages.map((message) => (
                            <MessageItem
                                key={message.id}
                                message={message}
                                userName={session?.user?.name?.[0]?.toUpperCase() || "U"}
                            />
                        ))}

                        {/* Typing indicator - shown when waiting for AI response */}
                        {isLoading && !streamingMessage && (
                            <div className="flex gap-2 sm:gap-4 items-start justify-start">
                                <AIAvatar/>
                                <div
                                    className="max-w-[90vw] sm:max-w-3xl lg:max-w-4xl px-4 py-4 sm:px-8 sm:py-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                    <TypingIndicator/>
                                </div>
                            </div>
                        )}

                        {/* Streaming message - shown while AI is responding */}
                        {streamingMessage && (
                            <div className="flex gap-2 sm:gap-4 items-start justify-start">
                                <AIAvatar/>
                                <div
                                    className="max-w-[90vw] sm:max-w-3xl lg:max-w-4xl px-4 py-4 sm:px-8 sm:py-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                    <Suspense fallback={<div className="text-base text-gray-400">Loading...</div>}>
                                        <Markdown content={streamingMessage} className="text-base"/>
                                    </Suspense>
                                    <TypingIndicator />
                                </div>
                            </div>
                        )}
                        {/* Invisible div to scroll to */}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Input Area */}
                <div
                    className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 sm:px-6 py-3 sm:py-4">
                    <div className="max-w-3xl mx-auto">
                        <div className="flex gap-2 sm:gap-3 items-start">
                            <div className="flex-1 relative">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                    placeholder="Ask about luxury investments, market trends, or portfolio optimization..."
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 pr-12 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none placeholder:text-ellipsis placeholder:overflow-hidden placeholder:whitespace-nowrap placeholder:text-sm sm:placeholder:text-base placeholder:text-gray-400 dark:placeholder:text-gray-500 text-sm sm:text-base"
                    rows={1}
                    style={{minHeight: '48px', maxHeight: '200px'}}
                />
                            </div>
                            <Button
                                onClick={() => handleSend()}
                                disabled={!input.trim() || isLoading}
                                size="lg"
                                className="bg-custom-brand hover:bg-custom-brand-hover text-white rounded-2xl h-[48px] w-[48px] sm:h-[52px] sm:w-auto sm:px-6 p-0 flex-shrink-0"
                            >
                                <Send className="h-4 w-4 sm:h-5 sm:w-5"/>
                            </Button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 sm:mt-3 text-center px-2">
                            Prophetic Orchestra 7.5 can make mistakes. Verify investment advice with certified advisors.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
