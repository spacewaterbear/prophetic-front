import {memo} from "react";

/**
 * TypingIndicator - Animated typing dots indicator for streaming content
 *
 * Features:
 * - Three dots bouncing sequentially in a wave pattern
 * - Highly visible with good contrast in light/dark modes
 * - Smooth animation with staggered delays
 * - Inline display that flows with text
 */
export const TypingIndicator = memo(() => {
  return (
    <span className="inline-flex gap-1 items-center ml-1" role="status" aria-label="Loading response">
      <span
        className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-bounce"
        style={{ animationDelay: "0ms", animationDuration: "0.8s" }}
      />
      <span
        className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-bounce"
        style={{ animationDelay: "200ms", animationDuration: "0.8s" }}
      />
      <span
        className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-bounce"
        style={{ animationDelay: "400ms", animationDuration: "0.8s" }}
      />
    </span>
  );
});

TypingIndicator.displayName = "TypingIndicator";
