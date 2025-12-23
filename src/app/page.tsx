"use client";

import {useEffect, useState} from "react";
import {useSession} from "next-auth/react";
import {useRouter} from "next/navigation";
import Image from "next/image";
import {useTheme} from "next-themes";
import {useI18n} from "@/contexts/i18n-context";

export default function Home() {
    const {data: session, status} = useSession();
    const router = useRouter();
    const {theme, resolvedTheme} = useTheme();
    const isDark = theme === "dark" || resolvedTheme === "dark";
    const {t} = useI18n();
    const [mounted, setMounted] = useState(false);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Handle sending message from welcome screen
    const handleWelcomeSend = async () => {
        if (!input.trim() || isLoading) return;

        setIsLoading(true);
        try {
            const title = input.length > 50 ? input.substring(0, 50) + "..." : input;

            const response = await fetch("/api/conversations", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    title: title,
                    model: "anthropic/claude-3.7-sonnet",
                }),
            });

            if (response.ok) {
                const data = await response.json();
                const newConversationId = data.conversation.id;
                // Navigate to the new conversation with the input as a query parameter
                router.push(`/chat/${newConversationId}?message=${encodeURIComponent(input)}`);
            }
        } catch (error) {
            console.error("Error creating conversation:", error);
            setIsLoading(false);
        }
    };

    // Redirect to chat layout which handles the welcome screen
    useEffect(() => {
        if (status === "authenticated" && session?.user) {
            router.push("/chat");
        }
    }, [status, session, router]);

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

    return null;
}
