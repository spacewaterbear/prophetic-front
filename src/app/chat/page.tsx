"use client";

import { Suspense, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useI18n } from "@/contexts/i18n-context";
import { ChatInput } from "@/components/ChatInput";
import { ThemeToggle } from "@/components/ThemeToggle";
import { VignetteGridCard } from "@/components/VignetteGridCard";
import { VignetteData } from "@/types/vignettes";

function ChatWelcomeContent() {
    const { data: session } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { theme, resolvedTheme } = useTheme();
    const isDark = theme === "dark" || resolvedTheme === "dark";
    const { t } = useI18n();
    const [mounted, setMounted] = useState(false);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [vignettes, setVignettes] = useState<VignetteData[]>([]);
    const [vignetteLoading, setVignetteLoading] = useState(false);
    const [vignetteError, setVignetteError] = useState<string | null>(null);
    const [selectedAgent, setSelectedAgent] = useState<'discover' | 'intelligence' | 'oracle'>('discover');

    useEffect(() => {
        setMounted(true);
    }, []);

    // Fetch vignettes when category changes
    useEffect(() => {
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
    }, [searchParams]);

    // Handle sending message from welcome screen
    const handleWelcomeSend = async (messageToSend?: string, flashCards?: string, flashCardType?: 'flash_invest' | 'ranking') => {
        const userMessage = messageToSend || input;
        if (!userMessage.trim() || isLoading) return;

        setIsLoading(true);
        try {
            const title = userMessage.length > 50 ? userMessage.substring(0, 50) + "..." : userMessage;

            // Create conversation
            const response = await fetch("/api/conversations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: title,
                    model: "anthropic/claude-3.7-sonnet",
                }),
            });

            if (response.ok) {
                const data = await response.json();
                const newConversationId = data.conversation.id;

                // Send the message
                await fetch(`/api/conversations/${newConversationId}/messages`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        content: userMessage,
                        flash_cards: flashCards,
                        flash_card_type: flashCardType
                    }),
                });

                // Refresh conversations list in sidebar
                window.dispatchEvent(new Event("refreshConversations"));
                // Navigate to the new conversation
                router.push(`/chat/${newConversationId}`);
            }
        } catch (error) {
            console.error("Error creating conversation:", error);
            setIsLoading(false);
        }
    };

    const handleFlashcardClick = (flashCards: string, question: string, flashCardType: 'flash_invest' | 'ranking') => {
        handleWelcomeSend(question, flashCards, flashCardType);
    };

    return (
        <>
            {/* Header */}
            <header className="relative z-10 bg-[rgba(247,240,232,0.8)] dark:bg-black backdrop-blur-md border-b border-gray-300 dark:border-gray-800 px-6 py-3 sm:py-4 flex items-center justify-between">
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
                </div>
            </header>

            {/* Welcome Content */}
            <div className="relative flex-1 bg-[rgb(247,240,232)] dark:bg-[rgb(1,1,0)] px-6 overflow-y-auto">
                <div className="w-full max-w-4xl flex flex-col items-center py-10 mx-auto mt-[100px]">
                    {vignettes.length > 0 ? (
                        /* Vignettes Display */
                        <div className="w-full relative">
                            <VignetteGridCard data={vignettes} />
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
                                handleSend={() => handleWelcomeSend()}
                                isLoading={isLoading}
                                onFlashcardClick={handleFlashcardClick}
                                userStatus={(session?.user as { status?: string })?.status as 'unauthorized' | 'free' | 'paid' | 'admini' | 'discover' | 'intelligence' | 'oracle' | undefined}
                                selectedAgent={selectedAgent}
                                onAgentChange={setSelectedAgent}
                                className="max-w-3xl"
                            />
                        </>
                    )}
                </div>
            </div>
        </>
    );
}

export default function ChatWelcome() {
    return (
        <Suspense fallback={
            <div className="flex-1 flex items-center justify-center bg-[rgb(247,240,232)] dark:bg-[rgb(1,1,0)]">
                <div className="w-12 h-12 border-4 border-gray-300 dark:border-gray-700 border-t-gray-900 dark:border-t-white rounded-full animate-spin" />
            </div>
        }>
            <ChatWelcomeContent />
        </Suspense>
    );
}
