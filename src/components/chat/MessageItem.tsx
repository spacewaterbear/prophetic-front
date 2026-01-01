"use client";

import { memo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AIAvatar } from "./AIAvatar";

interface MessageItemProps {
  message: {
    id: number;
    content: string;
    sender: "user" | "ai" | "assistant";
    created_at?: string;
  };
  userName: string;
  children?: React.ReactNode; // For rendering additional content (markdown, cards, etc.)
}

export const MessageItem = memo(({ message, userName, children }: MessageItemProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Failed to copy to clipboard");
    }
  };

  // Normalize sender to handle both "ai" and "assistant"
  const isAI = message.sender === "ai" || message.sender === "assistant";
  const isUser = message.sender === "user";

  return (
    <div
      className={`flex gap-2 sm:gap-4 items-start ${isUser ? "justify-end" : "justify-start w-full"}`}
    >
      {isAI && <AIAvatar />}
      <div className={`group flex flex-col gap-2 ${isAI ? "w-full" : ""}`}>
        <div
          className={`py-4 sm:py-5 rounded-2xl ${
            isUser
              ? "bg-[rgb(230,220,210)] dark:bg-gray-700 text-gray-900 dark:text-white max-w-[90vw] sm:max-w-3xl lg:max-w-4xl px-1.5"
              : "bg-[rgb(247,240,232)] dark:bg-[rgb(1,1,0)] text-gray-900 dark:text-white w-full"
          }`}
        >
          {children ? (
            children
          ) : (
            <p className="text-base leading-relaxed whitespace-pre-wrap px-[10px]">
              {message.content}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCopy}
          className={`h-7 w-7 sm:h-8 sm:w-8 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity self-end ${
            isUser
              ? "text-gray-500 hover:bg-black/5 dark:text-white dark:hover:bg-white/20"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
          aria-label="Copy message"
        >
          {copied ? (
            <Check className="h-3 w-3 sm:h-4 sm:w-4" />
          ) : (
            <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
          )}
        </Button>
      </div>
      {isUser && (
        <div className="hidden sm:flex w-8 h-8 sm:w-10 sm:h-10 mt-1 rounded-full bg-gray-800 dark:bg-white/10 items-center justify-center text-white dark:text-white font-medium flex-shrink-0 leading-none text-base sm:text-lg">
          {userName}
        </div>
      )}
    </div>
  );
});

MessageItem.displayName = "MessageItem";
