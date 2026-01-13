"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Check,
  Copy,
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  Search,
  Send,
  X,
} from "lucide-react";
import Image from "next/image";
import { lazy, memo, Suspense, useEffect, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { ModelSelector } from "@/components/ModelSelector";
import { DEFAULT_NON_ADMIN_MODEL } from "@/lib/models";
import { TypingIndicator } from "@/components/TypingIndicator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ShareButton } from "@/components/ShareButton";
import { toast } from "sonner";
import { useI18n } from "@/contexts/i18n-context";
import { ChatInput } from "@/components/ChatInput";
import { FileAttachment } from "@/components/FileAttachment";
import { AIAvatar } from "@/components/chat/AIAvatar";

// Lazy load Markdown component to reduce initial bundle size
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
const WhiskeyGridCard = lazy(() =>
  import("@/components/WhiskeyGridCard").then((mod) => ({
    default: mod.WhiskeyGridCard,
  })),
);

interface Artist {
  artist_name: string;
  artist_picture_url: string | null;
  primary_country: string | null;
  country_iso_code: string | null;
  total_artworks: number | null;
  ratio_sold?: number; // Float between 0 and 1
  social_score?: number; // Float between 0 and 1
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

interface WhiskeyGridData {
  items: Array<{
    title: string;
    subtitle?: string;
    image_url: string;
  }>;
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
  marketplace_data?: MarketplaceData;
  marketplace_position?: "before" | "after"; // Position of marketplace data relative to text
  real_estate_data?: RealEstateData;
  whiskey_grid_data?: WhiskeyGridData;
  metadata?: {
    attachments?: Array<{
      url: string;
      name: string;
      size: number;
      type: string;
      path?: string;
    }>;
    is_flashcard?: boolean;
  };
}

interface Conversation {
  id: number;
  title: string | null;
  model: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// Memoized message component to prevent unnecessary re-renders
const MessageItem = memo(
  ({ message, userName }: { message: Message; userName: string }) => {
    const [copied, setCopied] = useState(false);

    // Log marketplace data for debugging
    if (message.marketplace_data) {
      console.log(
        "[MessageItem RENDER] Rendering message with marketplace_data:",
        {
          id: message.id,
          sender: message.sender,
          marketplace: message.marketplace_data.marketplace,
          found: message.marketplace_data.found,
          position: message.marketplace_position,
        },
      );
    }

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

    // Hide user messages that are from flashcards
    if (message.sender === "user" && message.metadata?.is_flashcard) {
      return null;
    }

    return (
      <div
        className={`flex gap-2 sm:gap-4 items-start ${message.sender === "user" ? "justify-end" : "justify-start w-full"}`}
      >
        {message.sender === "ai" && <AIAvatar />}
        <div className={`group flex flex-col gap-2 ${message.sender === "ai" ? "w-full" : ""}`}>
          <div
            className={`py-4 sm:py-5 rounded-2xl ${message.sender === "user"
              ? "bg-[rgb(230,220,210)] dark:bg-gray-700 text-gray-900 dark:text-white max-w-[90vw] sm:max-w-3xl lg:max-w-4xl px-1.5"
              : "bg-[rgb(247,240,232)] dark:bg-[rgb(1,1,0)] text-gray-900 dark:text-white w-full"
              }`}
          >
            {message.sender === "user" ? (
              <>
                <p className="text-base leading-relaxed whitespace-pre-wrap px-[10px]">
                  {message.content}
                </p>
                {message.metadata?.attachments && message.metadata.attachments.length > 0 && (
                  <div className="mt-3 space-y-2 px-[10px]">
                    {message.metadata.attachments.map((file, idx) => (
                      <FileAttachment
                        key={idx}
                        url={file.url}
                        name={file.name}
                        size={file.size}
                        type={file.type}
                      />
                    ))}
                  </div>
                )}
              </>
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
                {/* Display text content if present */}
                {message.content && (
                  <Suspense
                    fallback={
                      <div className="text-base text-gray-400">Loading...</div>
                    }
                  >
                    <Markdown content={message.content} className="text-base" />
                  </Suspense>
                )}

                {/* Display marketplace data AFTER text (default behavior) */}
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

                {/* Display marketplace data BEFORE text if position is 'before' */}
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

                {/* Display real estate data */}
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

                {/* Display whiskey grid */}
                {message.whiskey_grid_data && (
                  <div className={message.content ? "mt-4" : ""}>
                    <Suspense
                      fallback={
                        <div className="text-base text-gray-400">
                          Loading whiskey grid...
                        </div>
                      }
                    >
                      <WhiskeyGridCard data={message.whiskey_grid_data} />
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
        {message.sender === "user" && (
          <div className="hidden sm:flex w-8 h-8 sm:w-10 sm:h-10 mt-1 rounded-full bg-gray-800 dark:bg-white/10 items-center justify-center text-white dark:text-white font-medium flex-shrink-0 leading-none text-base sm:text-lg">
            {userName}
          </div>
        )}
      </div>
    );
  },
);

MessageItem.displayName = "MessageItem";

// Example prompts - moved outside component to prevent recreation on every render
const examplePrompts = [
  "Propose me an investment portfolio for $150K",
  "What watches should I buy with a $50K investment?",
  "Which NFTs are worth buying with a $50K budget?",
  "tell me what you know about Jean-Michel Basquiat",
];

// Helper function to check if user is admin
const isAdminUser = (
  session: { user?: { status?: string } } | null,
): boolean => {
  return session?.user?.status === "admini";
};

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === "dark" || resolvedTheme === "dark";
  const { t } = useI18n();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    // Default to closed on mobile, open on desktop
    if (typeof window !== "undefined") {
      return window.innerWidth >= 768; // Tailwind's md breakpoint
    }
    return false; // Default to closed for SSR
  });
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<
    number | null
  >(null);
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
  const [selectedAgent, setSelectedAgent] = useState<'discover' | 'intelligence' | 'oracle'>('discover');
  const [attachedFiles, setAttachedFiles] = useState<import("@/components/FileUploadPreview").AttachedFile[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [lastStreamingActivity, setLastStreamingActivity] = useState<number>(0);
  const [showStreamingIndicator, setShowStreamingIndicator] = useState(false);

  // Redirect to login if not authenticated or to registration-pending if unauthorized
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
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Set mounted state after client-side hydration
  useEffect(() => {
    setMounted(true);
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

  // Detect streaming pauses and show typing indicator
  useEffect(() => {
    if (!isLoading) {
      setShowStreamingIndicator(false);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastStreamingActivity;

      // Show indicator if:
      // - We're loading
      // - There's a streaming message (initial text received)
      // - No activity for more than 500ms
      if (isLoading && streamingMessage && timeSinceLastActivity > 500) {
        setShowStreamingIndicator(true);
      } else {
        setShowStreamingIndicator(false);
      }
    }, 300);

    return () => clearInterval(interval);
  }, [isLoading, streamingMessage, lastStreamingActivity]);



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
        console.log("[LOAD CONVERSATION] Received data:", {
          messageCount: data.messages?.length,
          messages: data.messages?.map((m: Message) => ({
            id: m.id,
            sender: m.sender,
            hasContent: !!m.content,
            hasMarketplaceData: !!m.marketplace_data,
            marketplace_position: m.marketplace_position,
            type: m.type,
            // Log the actual marketplace_data for debugging
            marketplace_data_preview: m.marketplace_data
              ? {
                found: m.marketplace_data.found,
                marketplace: m.marketplace_data.marketplace,
              }
              : null,
          })),
        });

        // Log each message's marketplace_data before setting state
        data.messages?.forEach((msg: Message, idx: number) => {
          if (msg.marketplace_data) {
            console.log(
              `[LOAD CONVERSATION] Message ${idx} has marketplace_data:`,
              {
                id: msg.id,
                marketplace: msg.marketplace_data.marketplace,
                found: msg.marketplace_data.found,
                artworkCount: msg.marketplace_data.artworks?.length,
              },
            );
          }
        });

        setMessages(data.messages || []);
        console.log("[LOAD CONVERSATION] Messages state updated");
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
    setStreamingMarketplaceData(null);
    setStreamingRealEstateData(null);
    setCurrentStatus("");

    // Focus the input field after state updates
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const deleteConversation = async (
    conversationId: number,
    e: React.MouseEvent,
  ) => {
    // Prevent the click from triggering the conversation load
    e.stopPropagation();

    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Remove the conversation from the list
        setConversations((prev) => prev.filter((c) => c.id !== conversationId));

        // If we deleted the current conversation, clear the chat
        if (currentConversationId === conversationId) {
          setCurrentConversationId(null);
          setMessages([]);
          setStreamingMessage("");
          setStreamingMarketplaceData(null);
          setStreamingRealEstateData(null);
        }
      } else {
        console.error("Failed to delete conversation:", response.status);
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  const handleModelChange = async (newModel: string) => {
    setSelectedModel(newModel);

    // Update the current conversation's model if there is one
    if (currentConversationId) {
      try {
        await fetch(`/api/conversations/${currentConversationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: newModel }),
        });
      } catch (error) {
        console.error("Error updating conversation model:", error);
      }
    }
  };

  const handleFlashcardClick = (flashCards: string, question: string, flashCardType: 'flash_invest' | 'ranking') => {
    handleSend(question, { flash_cards: flashCards, question, flash_card_type: flashCardType });
  };

  const handlePortfolioClick = () => {
    handleSend("Show me portfolio recommendations", { flash_card_type: 'portfolio' });
  };

  const handleWhiskeyGridTest = () => {
    // Create a whiskey grid message without making an API call
    const whiskeyGridMessage: Message = {
      id: Date.now(),
      content: "",
      sender: "ai",
      created_at: new Date().toISOString(),
      whiskey_grid_data: {
        items: [
          {
            title: "Chichibu",
            subtitle: "X Insights",
            image_url: "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/test/chichibu.png"
          },
          {
            title: "Karuizawa",
            subtitle: "X Insights",
            image_url: "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/test/karuizawa.png"
          },
          {
            title: "Macallan",
            subtitle: "X Insights",
            image_url: "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/test/macalan.png"
          },
          {
            title: "Yamazaki",
            subtitle: "X Insights",
            image_url: "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/test/yamazaki.png"
          }
        ]
      }
    };
    setMessages((prev) => [...prev, whiskeyGridMessage]);
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

  // Don't render if not authenticated
  if (!session) {
    return null;
  }

  const handleSend = async (messageToSend?: string, flashcardData?: { flash_cards?: string; question?: string; flash_card_type?: 'flash_invest' | 'ranking' | 'portfolio' }) => {
    const userInput = messageToSend || input;
    if (!userInput.trim() || isLoading) return;

    // Check if all files are uploaded
    const hasUploadingFiles = attachedFiles.some(f => f.uploadStatus === 'uploading');
    if (hasUploadingFiles) {
      toast.error("Please wait for all files to finish uploading");
      return;
    }

    const completedFiles = attachedFiles.filter(f => f.uploadStatus === 'completed');

    setInput("");
    setIsLoading(true);
    setStreamingMessage("");
    setStreamingMarketplaceData(null);
    setStreamingRealEstateData(null);
    setCurrentStatus("");
    setLastStreamingActivity(Date.now());
    setShowStreamingIndicator(false);

    // Add user message to UI immediately with attachments
    const tempUserMessage: Message = {
      id: Date.now(), // Temporary ID
      content: userInput,
      sender: "user",
      created_at: new Date().toISOString(),
      metadata: {
        ...(completedFiles.length > 0 ? {
          attachments: completedFiles.map(f => ({
            url: f.url!,
            name: f.name,
            size: f.size,
            type: f.type,
            path: f.path
          }))
        } : {}),
        ...(flashcardData ? { is_flashcard: true } : {})
      }
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      // Create conversation if needed
      let conversationId = currentConversationId;
      if (!conversationId) {
        // Generate title from user's question (first 50 chars)
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
          conversationId = data.conversation.id;
          setCurrentConversationId(conversationId);
          await loadConversations();
        }
      }

      if (!conversationId) {
        throw new Error("Failed to create conversation");
      }

      // Send message with streaming
      const response = await fetch(
        `/api/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: userInput,
            agent_type: selectedAgent,
            attachments: completedFiles.map(f => ({
              url: f.url!,
              name: f.name,
              size: f.size,
              type: f.type,
              path: f.path
            })),
            flash_cards: flashcardData?.flash_cards,
            flash_card_question: flashcardData?.question,
            flash_card_type: flashcardData?.flash_card_type
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
          // Strip "data: " prefix if present (defensive SSE parsing)
          let cleanedLine = line;
          if (line.startsWith("data: ")) {
            cleanedLine = line.slice(6); // Remove "data: " (6 characters)
          }

          try {
            const data = JSON.parse(cleanedLine);
            console.log("[FRONTEND DEBUG] Received event:", data.type, data);

            if (data.type === "chunk") {
              streamContent += data.content;
              setStreamingMessage(streamContent);
              setLastStreamingActivity(Date.now());
              // Clear status when content starts streaming
              setCurrentStatus("");
            } else if (data.type === "artist_info") {
              // Handle structured artist info response
              // Check if this is a "done" message (has userMessage/aiMessage) or actual artist data
              if (data.userMessage || data.aiMessage) {
                // This is a completion message, treat it as "done"
                console.log(
                  "[FRONTEND DEBUG] artist_info done event detected, calling loadConversation",
                );

                try {
                  await loadConversation(conversationId);
                  console.log(
                    "[FRONTEND DEBUG] loadConversation completed successfully",
                  );

                  // Clear streaming state immediately (React batches updates)
                  setStreamingMessage("");
                  setStreamingMarketplaceData(null);
                  setStreamingRealEstateData(null);
                  setCurrentStatus("");
                  console.log(
                    "[FRONTEND DEBUG] Streaming state cleared immediately",
                  );
                } catch (err) {
                  console.error("Error reloading conversation:", err);
                  // Clear streaming state even on error to prevent stuck UI
                  setStreamingMessage("");
                  setStreamingMarketplaceData(null);
                  setStreamingRealEstateData(null);
                }
                continue;
              }

              // Extract the nested data object from backend
              const artistData = data.data;

              // Defensive check: ensure artistData exists
              if (!artistData) {
                console.error(
                  "[Artist Info] Missing nested data, skipping:",
                  data,
                );
                continue;
              }

              // DISABLED: Don't display ArtistCard during streaming
              // Uncomment the code below to re-enable ArtistCard display during streaming
              /*
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
                            */

              // setStreamingMessage("");
              // setStreamingMarketplaceData(null);

              // No reload needed - message is already complete and displayable
              // The backend has already saved it, and we have all the data we need
            } else if (data.type === "marketplace_data") {
              const marketplaceData = data.data;

              if (!marketplaceData) {
                console.error(
                  "[Marketplace Data] Missing nested data, skipping:",
                  data,
                );
                continue;
              }

              console.log(
                "[DEBUG] Processing marketplace_data event",
                marketplaceData,
              );

              // Set streaming marketplace data to display it immediately
              setStreamingMarketplaceData(marketplaceData);
            } else if (data.type === "real_estate_data") {
              const realEstateData = data.data;
              if (!realEstateData) {
                console.error(
                  "[Real Estate Data] Missing nested data, skipping:",
                  data,
                );
                continue;
              }
              console.log(
                "[DEBUG] Processing real_estate_data event",
                realEstateData,
              );
              setStreamingRealEstateData(realEstateData);
            } else if (data.type === "metadata") {
              // Handle metadata messages (e.g., intro text with skip_streaming flag)
              if (data.skip_streaming && data.intro) {
                // If skip_streaming is true, add the intro text immediately
                streamContent += data.intro + "\n\n";
                setStreamingMessage(streamContent);
              }
              // If skip_streaming is false, the intro will be streamed as chunks
            } else if (data.type === "done") {
              console.log(
                "[FRONTEND DEBUG] done event detected, calling loadConversation",
              );

              // Always reload conversation to get the complete state from database
              // This ensures both text and marketplace data are displayed correctly
              try {
                await loadConversation(conversationId);
                console.log(
                  "[FRONTEND DEBUG] loadConversation completed successfully",
                );

                // Clear streaming state immediately
                // React batches state updates, so setMessages() from loadConversation
                // and these clear calls will render in the same cycle, preventing duplicate bubbles
                setStreamingMessage("");
                setStreamingMarketplaceData(null);
                setStreamingRealEstateData(null);
                setCurrentStatus("");
                console.log(
                  "[FRONTEND DEBUG] Streaming state cleared immediately",
                );
              } catch (err) {
                console.error("Error reloading conversation:", err);
                // Clear streaming state even on error to prevent stuck UI
                setStreamingMessage("");
                setStreamingMarketplaceData(null);
                setStreamingRealEstateData(null);
                setCurrentStatus("");
              }
            } else if (data.type === "status") {
              // Handle status messages
              console.log("[FRONTEND DEBUG] Received status:", data.message);
              setCurrentStatus(data.message);
              setLastStreamingActivity(Date.now());
            } else if (data.type === "error") {
              console.log("Stream error:", data.error);
              // Display error to user
              const errorMessage: Message = {
                id: Date.now(),
                content: data.error,
                sender: "ai",
                created_at: new Date().toISOString(),
              };
              setMessages((prev) => [...prev, errorMessage]);
              setStreamingMessage("");
              setIsLoading(false);
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
      // Display error to user
      const errorMessage: Message = {
        id: Date.now(),
        content: `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sender: "ai",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      // Clear attached files after send (success or failure)
      setAttachedFiles([]);
    }
  };

  return (
    <div className="main-container bg-[rgb(247,240,232)] dark:bg-[rgb(1,1,0)]">
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
        className={`${sidebarOpen ? "w-64" : "w-0"} transition-all duration-300 bg-[rgb(230,220,210)] dark:bg-[#1e1f20] text-gray-900 dark:text-white flex flex-col overflow-hidden fixed md:relative h-full z-50 md:z-auto`}
      >
        <div className="p-4 border-b border-gray-400 dark:border-gray-800">
          <Button
            className="w-full bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 rounded-lg dark:bg-white/10 dark:hover:bg-white/20 dark:border-white/20"
            onClick={createNewConversation}
            disabled={isLoading}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('nav.newChat')}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              {t('nav.recentChats')}
            </div>
            {conversations.length === 0 ? (
              <div className="text-xs text-gray-500 dark:text-gray-500 px-3 py-2">
                {t('nav.noConversations')}
              </div>
            ) : (
              conversations.map((conversation) => (
                <div key={conversation.id} className="relative group">
                  <button
                    onClick={() => loadConversation(conversation.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${currentConversationId === conversation.id
                      ? "bg-gray-700 border border-gray-600 shadow-sm text-white dark:bg-white/20 dark:border-white/30"
                      : "hover:bg-gray-600/30 border border-transparent dark:hover:bg-white/10"
                      }`}
                  >
                    <MessageSquare
                      className={`h-4 w-4 flex-shrink-0 ${currentConversationId === conversation.id
                        ? "text-gray-300 dark:text-gray-400"
                        : ""
                        }`}
                    />
                    <span
                      className={`truncate ${currentConversationId === conversation.id
                        ? "font-medium"
                        : ""
                        }`}
                    >
                      {conversation.title}
                    </span>
                  </button>
                  <button
                    onClick={(e) => deleteConversation(conversation.id, e)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-500/20 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                    aria-label="Delete conversation"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-400 dark:border-gray-800 space-y-2">
          {session?.user && (
            <div className="px-3 py-2 rounded-lg bg-gray-600/20 dark:bg-white/5 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-800 dark:bg-white/10 flex items-center justify-center text-white font-medium text-sm">
                  {session.user.name?.[0]?.toUpperCase() ||
                    session.user.email?.[0]?.toUpperCase() ||
                    "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {session.user.name}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    {session.user.email}
                  </p>
                </div>
              </div>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-800/10 dark:hover:bg-white/10 text-sm transition-colors flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            {t('nav.signOut')}
          </button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-[rgba(247,240,232,0.8)] dark:bg-black backdrop-blur-md border-b border-gray-300 dark:border-gray-800 px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex-shrink-0 h-9 w-9 sm:h-10 sm:w-10"
            >
              <Menu className="h-5 w-5" />
            </Button>
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
            <ThemeToggle />
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
          className={`chat-history py-4 sm:py-8 ${messages.length === 0 && !streamingMessage && !streamingMarketplaceData
            ? "flex items-center justify-center"
            : "px-3 sm:px-6"
            }`}
        >
          {messages.length === 0 &&
            !streamingMessage &&
            !streamingMarketplaceData && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 md:left-[calc(50%+128px)] w-full max-w-3xl px-4 sm:px-6">
                <div className="text-center mb-8">
                  <div className="w-[72px] h-[72px] sm:w-24 sm:h-24 mx-auto mb-6 sm:mb-8 rounded-full flex items-center justify-center overflow-hidden">
                    <Image
                      src={
                        mounted && isDark
                          ? "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/flavicon_white.svg"
                          : "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/flavicon_new.svg"
                      }
                      alt="Prophetic Orchestra"
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h2 className="text-4xl sm:text-6xl font-light mb-4 sm:mb-6 dark:text-white px-4">
                    {t('chat.greeting').replace('{name}', session?.user?.name?.split(' ')[0] || '')}
                  </h2>
                  <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 px-4">
                    {t('chat.welcomeMessage')}
                  </p>
                </div>

                {/* Centered Input Area */}
                <div className="w-full">
                  <ChatInput
                    input={input}
                    setInput={setInput}
                    handleSend={() => handleSend()}
                    isLoading={isLoading}
                    textareaRef={inputRef}
                    userStatus={session?.user?.status}
                    selectedAgent={selectedAgent}
                    onAgentChange={setSelectedAgent}
                    userId={session?.user?.id}
                    conversationId={currentConversationId || undefined}
                    attachedFiles={attachedFiles}
                    onFilesChange={setAttachedFiles}
                    onFlashcardClick={handleFlashcardClick}
                    onWhiskeyGridTest={handleWhiskeyGridTest}
                    onPortfolioClick={handlePortfolioClick}
                  />
                </div>
              </div>
            )}

          <div className="max-w-5xl mx-auto space-y-6">
            {messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                userName={session?.user?.name?.[0]?.toUpperCase() || "U"}
              />
            ))}

            {/* Typing indicator - shown when waiting for AI response */}
            {isLoading && !streamingMessage && !streamingMarketplaceData && (
              <div className="flex gap-2 sm:gap-4 items-start justify-start">
                <AIAvatar />
                <div className="max-w-[90vw] sm:max-w-3xl lg:max-w-4xl px-4 py-4 sm:px-8 sm:py-5 rounded-2xl bg-[rgb(247,240,232)] dark:bg-[rgb(1,1,0)]">
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
                  <div className="max-w-[90vw] sm:max-w-3xl lg:max-w-4xl pl-4 pr-12 py-4 sm:pl-8 sm:pr-14 sm:py-5 rounded-2xl bg-[rgb(247,240,232)] dark:bg-[rgb(1,1,0)] text-gray-900 dark:text-white">
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
                    {/* Show typing indicator when there's a pause in streaming */}
                    {showStreamingIndicator && (
                      <div className="mt-2">
                        <TypingIndicator />
                      </div>
                    )}
                    {/* Show typing indicator when loading and no streaming message yet */}
                    {isLoading && !streamingMessage && (
                      <TypingIndicator />
                    )}
                  </div>
                </div>
              )}
            {/* Invisible div to scroll to */}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area - shown at bottom when there are messages */}
        {(messages.length > 0 || streamingMessage || streamingMarketplaceData) && (
          <div className="input-area px-3 sm:px-6 py-3 sm:py-4 bg-[rgb(247,240,232)] dark:bg-black">
            <ChatInput
              input={input}
              setInput={setInput}
              handleSend={() => handleSend()}
              isLoading={isLoading}
              userStatus={session?.user?.status}
              selectedAgent={selectedAgent}
              onAgentChange={setSelectedAgent}
              userId={session?.user?.id}
              conversationId={currentConversationId || undefined}
              attachedFiles={attachedFiles}
              onFilesChange={setAttachedFiles}
              onFlashcardClick={handleFlashcardClick}
              onWhiskeyGridTest={handleWhiskeyGridTest}
              onPortfolioClick={handlePortfolioClick}
            />
          </div>
        )}
      </div>
    </div>
  );
}
