"use client";

import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ShareButton } from "@/components/ShareButton";
import { ModelSelector } from "@/components/ModelSelector";

interface ChatHeaderProps {
  isWelcomeScreen: boolean;
  isAdmin: boolean;
  selectedModel: string;
  onModelChange: (model: string) => void;
  isLoading: boolean;
  conversationId: number | null;
  mounted: boolean;
  isDark: boolean;
}

export function ChatHeader({
  isWelcomeScreen,
  isAdmin,
  selectedModel,
  onModelChange,
  isLoading,
  conversationId,
  mounted,
  isDark,
}: ChatHeaderProps) {
  return (
    <header className="relative z-10 bg-[rgba(249,248,244,0.8)] dark:bg-black backdrop-blur-md border-b border-gray-400 dark:border-gray-800 pl-14 pr-6 md:px-6 h-[52px] sm:h-[60px] flex items-center justify-between">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="cursor-pointer">
            <Image
              src={
                mounted && isDark
                  ? "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/logo_text_blanc.svg"
                  : "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/logo_text.svg"
              }
              alt="Prophetic Orchestra"
              width={180}
              height={45}
              className={
                isWelcomeScreen ? "h-7 sm:h-10 w-auto" : "h-6 sm:h-10 w-auto"
              }
            />
          </Link>
        </div>
      </div>
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        {!isWelcomeScreen && isAdmin && (
          <ModelSelector
            selectedModel={selectedModel}
            onModelChange={onModelChange}
            disabled={isLoading}
          />
        )}
        <ThemeToggle />
        {!isWelcomeScreen && (
          <ShareButton conversationId={conversationId} disabled={isLoading} />
        )}
      </div>
    </header>
  );
}
