"use client";

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
}

export function ChatHeader({
  isWelcomeScreen,
  isAdmin,
  selectedModel,
  onModelChange,
  isLoading,
  conversationId,
}: ChatHeaderProps) {
  return (
    <header className="relative z-10 bg-[rgba(249,248,244,0.8)] dark:bg-black backdrop-blur-md border-b border-gray-400 dark:border-gray-800 pl-14 pr-6 md:px-6 h-[52px] sm:h-[60px] flex items-center justify-between">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="cursor-pointer inline-flex items-start gap-1">
            <span
              className={`font-[family-name:var(--font-spectral)] tracking-wide text-gray-900 dark:text-white ${isWelcomeScreen ? "text-lg sm:text-2xl" : "text-base sm:text-2xl"}`}
            >
              {process.env.NEXT_PUBLIC_SPECIALITY === "art" ? (
                <span className="font-bold">Art Orchestra</span>
              ) : (
                <span className="font-semibold">Prophetic Orchestra</span>
              )}
            </span>
            <sup className="text-[10px] font-[family-name:var(--font-inter)] font-medium leading-none mt-1" style={{ color: "#372ee9" }}>
              beta
            </sup>
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
