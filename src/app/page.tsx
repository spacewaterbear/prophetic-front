"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useState } from "react";
import { useI18n } from "@/contexts/i18n-context";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === "dark" || resolvedTheme === "dark";
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (
      status === "authenticated" &&
      (session?.user as any)?.status === "unauthorized"
    ) {
      router.push("/registration-pending");
    }
  }, [status, session, router]);

  // Load conversations and redirect to latest or create new
  useEffect(() => {
    const loadAndRedirect = async () => {
      if (status === "authenticated" && session?.user) {
        try {
          const response = await fetch("/api/conversations");
          if (response.ok) {
            const data = await response.json();
            const conversations = data.conversations || [];

            if (conversations.length > 0) {
              // Redirect to the most recent conversation
              const latestConversation = conversations[0];
              router.push(`/chat/${latestConversation.id}`);
            } else {
              // No conversations exist, stay on welcome screen
              // User can create a new chat which will redirect them
            }
          }
        } catch (error) {
          console.error("Error loading conversations:", error);
        }
      }
    };

    loadAndRedirect();
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

  // Don't render if not authenticated
  if (!session) {
    return null;
  }

  // This will show briefly before redirect, or if no conversations exist
  return (
    <div className="flex h-screen items-center justify-center bg-[rgb(247,240,232)] dark:bg-[rgb(1,1,0)]">
      <div className="text-center">
        <div className="w-64 h-32 mx-auto mb-4 flex items-center justify-center">
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
