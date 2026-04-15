"use client";

import { memo, RefObject } from "react";
import { ChatInput } from "@/components/chat-input";
import { MessageItem } from "./MessageItem";
import { AIAvatar } from "./AIAvatar";
import { StreamingBubble } from "./StreamingBubble";
import { TypingIndicator } from "@/components/TypingIndicator";
import { Message, MarketplaceData, RealEstateData } from "@/types/chat";
import { VignetteData } from "@/types/vignettes";
import { ClothesSearchData } from "@/components/ClothesSearchCard";
import { JewelrySearchData } from "@/components/JewelryCard";
import { CarsSearchData } from "@/components/CarsCard";
import { WatchesSearchData } from "@/components/WatchesCard";
import { WhiskySearchData } from "@/components/WhiskyCard";
import { WineSearchData } from "@/components/WineCard";
import { CardsSearchData } from "@/components/SportsCardsCard";
import { useI18n } from "@/contexts/i18n-context";
import { useChatInputContext } from "@/contexts/chat-input-context";

interface ConversationViewProps {
  messages: Message[];
  isLoading: boolean;
  streamingMessage: string;
  streamingMarketplaceData: MarketplaceData | null;
  streamingRealEstateData: RealEstateData | null;
  streamingVignetteData: VignetteData[] | null;
  streamingClothesSearchData: ClothesSearchData | null;
  streamingJewelrySearchData: JewelrySearchData | null;
  streamingCarsSearchData: CarsSearchData | null;
  streamingWatchesSearchData: WatchesSearchData | null;
  streamingWhiskySearchData: WhiskySearchData | null;
  streamingWineSearchData: WineSearchData | null;
  streamingCardsSearchData: CardsSearchData | null;
  streamingVignetteCategory: string | null;
  currentStatus: string;
  streamingLastActivity: number;
  showStreamingIndicator: boolean;
  messagesEndRef: RefObject<HTMLDivElement>;
  messagesContainerRef: RefObject<HTMLDivElement>;
  handleScroll: () => void;
  handleVignetteClick: (vignette: VignetteData) => void;
  handleBackToCategory: (category: string) => void;
  input: string;
  setInput: (value: string) => void;
  handleSend: () => void;
  userName: string;
}

export const ConversationView = memo(function ConversationView({
  messages,
  isLoading,
  streamingMessage,
  streamingMarketplaceData,
  streamingRealEstateData,
  streamingVignetteData,
  streamingClothesSearchData,
  streamingJewelrySearchData,
  streamingCarsSearchData,
  streamingWatchesSearchData,
  streamingWhiskySearchData,
  streamingWineSearchData,
  streamingCardsSearchData,
  streamingVignetteCategory,
  currentStatus,
  streamingLastActivity,
  showStreamingIndicator,
  messagesEndRef,
  messagesContainerRef,
  handleScroll,
  handleVignetteClick,
  handleBackToCategory,
  input,
  setInput,
  handleSend,
  userName,
}: ConversationViewProps) {
  const { t } = useI18n();
  const { creditsExhausted, guestQuotaExhausted } = useChatInputContext();
  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto py-4 sm:py-8 px-3 sm:px-6 pb-5"
      >
        <div className="max-w-5xl mx-auto space-y-6">
          {messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              userName={userName}
              onVignetteClick={handleVignetteClick}
              handleBackToCategory={handleBackToCategory}
            />
          ))}

          {/* Typing indicator */}
          {isLoading &&
            !streamingMessage &&
            !streamingMarketplaceData &&
            !streamingVignetteData &&
            !streamingClothesSearchData &&
            !streamingJewelrySearchData &&
            !streamingCarsSearchData &&
            !streamingWatchesSearchData &&
            !streamingWhiskySearchData &&
            !streamingWineSearchData &&
            !streamingCardsSearchData && (
              <div className="flex gap-2 sm:gap-4 items-start justify-start">
                <AIAvatar />
                <div className="max-w-[90vw] sm:max-w-3xl lg:max-w-4xl px-3 sm:px-4 py-4 sm:py-5 rounded-2xl overflow-hidden bg-[rgb(249,248,244)] dark:bg-[rgb(1,1,0)]">
                  <TypingIndicator statusText={currentStatus} lastActivityAt={streamingLastActivity} />
                </div>
              </div>
            )}

          {/* Streaming Message Bubble */}
          <StreamingBubble
            streamingMessage={streamingMessage}
            streamingMarketplaceData={streamingMarketplaceData}
            streamingRealEstateData={streamingRealEstateData}
            streamingVignetteData={streamingVignetteData}
            streamingClothesSearchData={streamingClothesSearchData}
            streamingJewelrySearchData={streamingJewelrySearchData}
            streamingCarsSearchData={streamingCarsSearchData}
            streamingWatchesSearchData={streamingWatchesSearchData}
            streamingWhiskySearchData={streamingWhiskySearchData}
            streamingWineSearchData={streamingWineSearchData}
            streamingCardsSearchData={streamingCardsSearchData}
            streamingVignetteCategory={streamingVignetteCategory}
            showStreamingIndicator={showStreamingIndicator}
            isLoading={isLoading}
            currentStatus={currentStatus}
            lastActivityAt={streamingLastActivity}
            handleVignetteClick={handleVignetteClick}
            handleBackToCategory={handleBackToCategory}
          />
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      {guestQuotaExhausted ? (
        <div className="flex-shrink-0 w-full px-6 py-4 bg-[rgb(249,248,244)] dark:bg-black flex justify-center">
          <div className="max-w-3xl w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-6 py-5 text-center">
            <p className="font-semibold text-gray-900 dark:text-white text-base mb-1">
              {t("guestPaywall.title")}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {t("guestPaywall.message")}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <a
                href="/pricing"
                className="inline-flex items-center justify-center px-5 py-2 rounded-full bg-[#372ee9] hover:bg-[#2a22c7] text-white text-sm font-medium transition-colors"
              >
                {t("guestPaywall.cta")}
              </a>
              <a
                href="/login"
                className="inline-flex items-center justify-center px-5 py-2 rounded-full border border-gray-300 dark:border-white/20 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 text-sm font-medium transition-colors"
              >
                {t("guestPaywall.login")}
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-shrink-0 w-full px-6 py-3 sm:py-4 bg-[rgb(249,248,244)] dark:bg-black flex justify-center">
          <ChatInput
            input={input}
            setInput={setInput}
            handleSend={handleSend}
            isLoading={isLoading}
            className="max-w-3xl"
          />
        </div>
      )}
      <div className="flex-shrink-0 w-full pb-2 bg-[rgb(249,248,244)] dark:bg-black flex justify-center">
        <p className="text-[10px] text-gray-400 dark:text-gray-600 text-center">
          {t("chat.disclaimer")}
        </p>
      </div>
    </div>
  );
});
