"use client";

import { useState, useEffect, useRef } from "react";
import { translations } from "@/lib/translations";
import { useI18n } from "@/contexts/i18n-context";

const ROTATION_INTERVAL_MS = 2500;
const LOADING_TEXT_DELAY_MS = 1500;

interface TypingIndicatorProps {
  statusText?: string;
  lastActivityAt?: number;
}

export function TypingIndicator({ statusText, lastActivityAt }: TypingIndicatorProps) {
  const { language } = useI18n();
  const messages = translations[language].loadingMessages as readonly string[];
  const [index, setIndex] = useState(() => Math.floor(Math.random() * messages.length));
  const [showLoadingText, setShowLoadingText] = useState(lastActivityAt === undefined);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // When lastActivityAt changes (SSE sent something), hide loading text and start a 1.5s delay
  useEffect(() => {
    if (lastActivityAt === undefined) return;
    setShowLoadingText(false);
    if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
    delayTimerRef.current = setTimeout(() => {
      setShowLoadingText(true);
    }, LOADING_TEXT_DELAY_MS);
    return () => {
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
    };
  }, [lastActivityAt]);

  useEffect(() => {
    if (statusText) return;
    timerRef.current = setInterval(() => {
      setIndex((prev) => (prev + 1) % messages.length);
    }, ROTATION_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [statusText, messages.length]);

  const displayText = statusText || messages[index];
  const showText = statusText ? true : showLoadingText;

  return (
    <span className="inline-flex gap-2 items-center" role="status" aria-label="Loading response">
      <span className="inline-flex gap-1 items-center">
        <span
          className="w-2 h-2 bg-gray-900 dark:bg-white rounded-full animate-bounce"
          style={{ animationDelay: "0ms", animationDuration: "0.8s" }}
        />
        <span
          className="w-2 h-2 bg-gray-900 dark:bg-white rounded-full animate-bounce"
          style={{ animationDelay: "200ms", animationDuration: "0.8s" }}
        />
        <span
          className="w-2 h-2 bg-gray-900 dark:bg-white rounded-full animate-bounce"
          style={{ animationDelay: "400ms", animationDuration: "0.8s" }}
        />
      </span>
      {showText && (
        <span className="text-sm text-gray-500 dark:text-gray-400 italic">
          {displayText}
        </span>
      )}
    </span>
  );
}

TypingIndicator.displayName = "TypingIndicator";
