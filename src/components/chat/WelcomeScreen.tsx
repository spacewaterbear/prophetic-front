"use client";

import { lazy, Suspense, useRef } from "react";
import Image from "next/image";
import { useI18n } from "@/contexts/i18n-context";
import { ChatInput } from "@/components/chat-input";
import { MessageItem } from "./MessageItem";
import { AIAvatar } from "./AIAvatar";
import { Message, CATEGORY_DISPLAY_NAMES } from "@/types/chat";
import { VignetteData } from "@/types/vignettes";
import { AgentType, UserStatus } from "@/types/agents";

const Markdown = lazy(() =>
  import("@/components/Markdown").then((mod) => ({ default: mod.Markdown })),
);
const VignetteGridCard = lazy(() =>
  import("@/components/VignetteGridCard").then((mod) => ({
    default: mod.VignetteGridCard,
  })),
);

interface WelcomeScreenProps {
  messages: Message[];
  streamingMessage: string;
  streamingVignetteCategory: string | null;
  vignettes: VignetteData[];
  vignetteLoading: boolean;
  vignetteError: string | null;
  input: string;
  setInput: (value: string) => void;
  handleSend: () => void;
  isLoading: boolean;
  handleFlashcardClick: (
    flashCards: string,
    question: string,
    flashCardType: "flash_invest" | "ranking" | "portfolio" | "PORTFOLIO",
    displayName: string,
    tier?: string,
  ) => void;
  handleVignetteClick: (vignette: VignetteData) => void;
  handleBackToCategory: (category: string) => void;
  userName: string;
  profileUsername: string | null;
  userStatus?: UserStatus;
  selectedAgent: AgentType;
  onAgentChange: (agent: AgentType) => void;
  mounted: boolean;
  isDark: boolean;
}

export function WelcomeScreen({
  messages,
  streamingMessage,
  streamingVignetteCategory,
  vignettes,
  vignetteLoading,
  vignetteError,
  input,
  setInput,
  handleSend,
  isLoading,
  handleFlashcardClick,
  handleVignetteClick,
  handleBackToCategory,
  userName,
  profileUsername,
  userStatus,
  selectedAgent,
  onAgentChange,
  mounted,
  isDark,
}: WelcomeScreenProps) {
  const welcomeContainerRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  return (
    <div
      ref={welcomeContainerRef}
      className="relative flex-1 bg-[rgb(249,248,244)] dark:bg-[rgb(1,1,0)] px-6 overflow-y-auto"
    >
      <div
        className={`w-full max-w-4xl flex flex-col items-center py-10 mx-auto ${
          vignettes.length === 0 &&
          messages.length === 0 &&
          !streamingMessage &&
          !vignetteLoading &&
          !vignetteError
            ? "min-h-full justify-center"
            : ""
        }`}
      >
        {messages.length > 0 || streamingMessage ? (
          <div className="w-full max-w-5xl space-y-6">
            {messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                userName={userName}
                onVignetteClick={handleVignetteClick}
                handleBackToCategory={handleBackToCategory}
              />
            ))}
            {streamingMessage && (
              <div className="flex gap-2 sm:gap-4 items-start justify-start">
                <AIAvatar />
                <div className="max-w-[90vw] sm:max-w-3xl lg:max-w-4xl px-3 sm:px-4 py-4 sm:py-5 rounded-2xl overflow-hidden bg-[rgb(249,248,244)] dark:bg-[rgb(1,1,0)] text-gray-900 dark:text-white">
                  <Suspense
                    fallback={
                      <div className="text-base text-gray-400">Loading...</div>
                    }
                  >
                    <Markdown
                      content={streamingMessage}
                      className="text-base"
                      categoryName={
                        streamingVignetteCategory
                          ? CATEGORY_DISPLAY_NAMES[streamingVignetteCategory]
                          : undefined
                      }
                      onCategoryClick={
                        streamingVignetteCategory
                          ? () =>
                              handleBackToCategory(streamingVignetteCategory)
                          : undefined
                      }
                    />
                  </Suspense>
                </div>
              </div>
            )}
          </div>
        ) : vignettes.length > 0 ? (
          <div className="w-full relative">
            <Suspense
              fallback={
                <div className="text-base text-gray-400">
                  Loading vignettes...
                </div>
              }
            >
              <VignetteGridCard
                data={vignettes}
                onVignetteClick={handleVignetteClick}
              />
            </Suspense>
          </div>
        ) : vignetteLoading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-gray-300 dark:border-gray-700 border-t-gray-900 dark:border-t-white rounded-full animate-spin" />
            <p className="text-gray-600 dark:text-gray-400">
              Loading vignettes...
            </p>
          </div>
        ) : vignetteError ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-red-600 dark:text-red-400">{vignetteError}</p>
          </div>
        ) : (
          <>
            {/* Logo */}
            <div className="w-[170px] h-[170px] flex items-center justify-center">
              <Image
                src={
                  mounted && isDark
                    ? "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/logo/flavicon_new_dark.svg"
                    : "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/logo/flavicon_new.svg"
                }
                alt="Prophetic Orchestra"
                width={300}
                height={300}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Greeting */}
            <h1 className="text-3xl sm:text-4xl font-medium text-gray-900 dark:text-white mb-3 pb-[30px]">
              {t("chat.greeting").replace(
                "{name}",
                profileUsername || userName || "",
              )}
            </h1>

            {/* Chat Input */}
            <ChatInput
              input={input}
              setInput={setInput}
              handleSend={handleSend}
              isLoading={isLoading}
              onFlashcardClick={handleFlashcardClick}
              userStatus={userStatus}
              selectedAgent={selectedAgent}
              onAgentChange={onAgentChange}
              className="max-w-3xl"
            />
          </>
        )}
      </div>
    </div>
  );
}
