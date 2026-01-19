"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useTheme } from "next-themes";

/**
 * Root page - Redirects to appropriate route based on authentication status
 * 
 * This page has been simplified to redirect users to /chat (the main application).
 * All chat functionality now lives in:
 * - /chat - Welcome page with vignettes
 * - /chat/[conversationId] - Individual conversations
 */
export default function Home() {
  const router = useRouter();
  const { status } = useSession();
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === "dark" || resolvedTheme === "dark";

  useEffect(() => {
    // In dev mode with SKIP_AUTH, redirect directly to chat
    if (process.env.NEXT_PUBLIC_SKIP_AUTH === "true") {
      router.replace("/chat");
      return;
    }
    if (status === "authenticated") {
      // Redirect authenticated users to the chat welcome page
      router.replace("/chat");
    } else if (status === "unauthenticated") {
      // Redirect unauthenticated users to login
      router.replace("/login");
    }
    // If status is "loading", show loading screen below
  }, [status, router]);

  // Show loading screen while checking authentication
  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-[rgb(247,240,232)] dark:bg-[rgb(1,1,0)]">
        <div className="text-center">
          <div className="w-64 h-32 mx-auto mb-4 flex items-center justify-center animate-pulse">
            <Image
              src={
                isDark
                  ? "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/logo_text_blanc.svg"
                  : "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/logo_text.svg"
              }
              alt="Prophetic Orchestra"
              width={256}
              height={64}
              className="w-full h-full object-contain"
            />
          </div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Return null while redirecting (prevents flash of content)
  return null;
}
