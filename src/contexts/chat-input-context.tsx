"use client";

import React, { createContext, useContext } from "react";
import type { AgentType, UserStatus } from "@/types/agents";
import type { ImmoVariant } from "@/types/chat";

interface ChatInputContextType {
  userStatus?: UserStatus;
  selectedAgent: AgentType;
  onAgentChange: (agent: AgentType) => void;
  creditsExhausted: boolean;
  guestQuotaExhausted: boolean;
  userId?: string;
  conversationId: number | null;
  handleFlashcardClick: (
    flashCards: string,
    question: string,
    flashCardType: "flash_invest" | "ranking" | "portfolio" | "PORTFOLIO",
    displayName: string,
    tier?: string,
  ) => void;
  immoVariant: ImmoVariant | null;
  onImmoVariantChange: (variant: ImmoVariant | null) => void;
  isTester?: boolean;
}

const ChatInputContext = createContext<ChatInputContextType | undefined>(undefined);

export function ChatInputProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: ChatInputContextType;
}) {
  return <ChatInputContext.Provider value={value}>{children}</ChatInputContext.Provider>;
}

export function useChatInputContext(): ChatInputContextType {
  const ctx = useContext(ChatInputContext);
  if (!ctx) throw new Error("useChatInputContext must be used inside ChatInputProvider");
  return ctx;
}
