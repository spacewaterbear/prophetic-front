"use client";

import { RefObject } from "react";
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
import { AgentType, UserStatus } from "@/types/agents";
import { useI18n } from "@/contexts/i18n-context";

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
  streamingVignetteCategory: string | null;
  currentStatus: string;
  showStreamingIndicator: boolean;
  messagesEndRef: RefObject<HTMLDivElement>;
  messagesContainerRef: RefObject<HTMLDivElement>;
  handleScroll: () => void;
  handleVignetteClick: (vignette: VignetteData) => void;
  handleBackToCategory: (category: string) => void;
  handleFlashcardClick: (
    flashCards: string,
    question: string,
    flashCardType: "flash_invest" | "ranking" | "portfolio" | "PORTFOLIO",
    displayName: string,
    tier?: string,
  ) => void;
  input: string;
  setInput: (value: string) => void;
  handleSend: () => void;
  userName: string;
  userStatus?: UserStatus;
  selectedAgent: AgentType;
  onAgentChange: (agent: AgentType) => void;
  creditsExhausted?: boolean;
}

export function ConversationView({
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
  streamingVignetteCategory,
  currentStatus,
  showStreamingIndicator,
  messagesEndRef,
  messagesContainerRef,
  handleScroll,
  handleVignetteClick,
  handleBackToCategory,
  handleFlashcardClick,
  input,
  setInput,
  handleSend,
  userName,
  userStatus,
  selectedAgent,
  onAgentChange,
  creditsExhausted,
}: ConversationViewProps) {
  const { t } = useI18n();
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
            !streamingWatchesSearchData && (
              <div className="flex gap-2 sm:gap-4 items-start justify-start">
                <AIAvatar />
                <div className="max-w-[90vw] sm:max-w-3xl lg:max-w-4xl px-3 sm:px-4 py-4 sm:py-5 rounded-2xl overflow-hidden bg-[rgb(249,248,244)] dark:bg-[rgb(1,1,0)]">
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
          <StreamingBubble
            streamingMessage={streamingMessage}
            streamingMarketplaceData={streamingMarketplaceData}
            streamingRealEstateData={streamingRealEstateData}
            streamingVignetteData={streamingVignetteData}
            streamingClothesSearchData={streamingClothesSearchData}
            streamingJewelrySearchData={streamingJewelrySearchData}
            streamingCarsSearchData={streamingCarsSearchData}
            streamingWatchesSearchData={streamingWatchesSearchData}
            streamingVignetteCategory={streamingVignetteCategory}
            showStreamingIndicator={showStreamingIndicator}
            isLoading={isLoading}
            handleVignetteClick={handleVignetteClick}
            handleBackToCategory={handleBackToCategory}
          />
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 w-full px-6 py-3 sm:py-4 bg-[rgb(249,248,244)] dark:bg-black flex justify-center">
        <ChatInput
          input={input}
          setInput={setInput}
          handleSend={handleSend}
          isLoading={isLoading}
          onFlashcardClick={handleFlashcardClick}
          userStatus={userStatus}
          selectedAgent={selectedAgent}
          onAgentChange={onAgentChange}
          creditsExhausted={creditsExhausted}
          className="max-w-3xl"
        />
      </div>
      <div className="flex-shrink-0 w-full pb-2 bg-[rgb(249,248,244)] dark:bg-black flex justify-center">
        <p className="text-[10px] text-gray-400 dark:text-gray-600 text-center">
          {t("chat.disclaimer")}
        </p>
      </div>
    </div>
  );
}
