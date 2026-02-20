"use client";

import { useEffect, useState, useRef, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import { AIAvatar } from "@/components/chat/AIAvatar";
import { ChatInput } from "@/components/chat-input";
import { AgentType, UserStatus } from "@/types/agents";
import { CATEGORY_DISPLAY_NAMES } from "@/types/chat";

const Markdown = lazy(() =>
  import("@/components/Markdown").then((mod) => ({ default: mod.Markdown })),
);

const PENDING_VIGNETTE_VIEW_KEY = "pendingVignetteView";

interface VignetteViewParams {
  imageName: string;
  category: string;
  tier: string;
}

interface VignetteDetailViewProps {
  vignetteSlug: string;
  selectedAgent: AgentType;
  onAgentChange: (agent: AgentType) => void;
  selectedModel: string;
  userStatus: UserStatus | undefined;
}

export function VignetteDetailView({
  vignetteSlug: _vignetteSlug,
  selectedAgent,
  onAgentChange,
  selectedModel,
  userStatus,
}: VignetteDetailViewProps) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [finalContent, setFinalContent] = useState("");
  const [vignetteCategory, setVignetteCategory] = useState<string | undefined>();
  const streamStartedRef = useRef(false);

  useEffect(() => {
    if (streamStartedRef.current) return;

    const paramsStr = sessionStorage.getItem(PENDING_VIGNETTE_VIEW_KEY);
    if (!paramsStr) return;

    streamStartedRef.current = true;
    sessionStorage.removeItem(PENDING_VIGNETTE_VIEW_KEY);

    let vignetteParams: VignetteViewParams;
    try {
      vignetteParams = JSON.parse(paramsStr);
    } catch {
      return;
    }

    setVignetteCategory(vignetteParams.category || undefined);
    streamVignetteContent(vignetteParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const streamVignetteContent = async (vignetteParams: VignetteViewParams) => {
    setIsLoading(true);
    setStreamingMessage("");

    try {
      let queryParams: Record<string, string>;

      if (vignetteParams.category === "CASH_FLOW_LEASING") {
        queryParams = {
          type: "dependant-without-sub",
          category: "CASH_FLOW_LEASING",
          markdown_name: vignetteParams.imageName,
          tiers_level: vignetteParams.tier || "DISCOVER",
        };
      } else {
        queryParams = {
          type: "independant",
          root_folder: "VIGNETTES",
          markdown_name: vignetteParams.imageName,
          category: vignetteParams.category || "",
        };
      }

      const query = new URLSearchParams(queryParams);
      const response = await fetch(`/api/markdown?${query.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch markdown: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");

      if (contentType?.includes("text/event-stream")) {
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let documentContent = "";
        let questionsContent = "";
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() || "";

          for (const event of events) {
            if (!event.trim()) continue;
            const lines = event.split("\n");
            let eventData = "";
            for (const line of lines) {
              if (line.startsWith("data: ")) eventData += line.slice(6);
            }

            if (!eventData || eventData === "[DONE]") continue;

            try {
              const parsed = JSON.parse(eventData);
              if (parsed.type === "document") {
                documentContent = parsed.content || "";
                setStreamingMessage(documentContent);
              } else if (parsed.type === "questions_chunk") {
                questionsContent += parsed.content || "";
                setStreamingMessage(documentContent + "\n\n" + questionsContent);
              } else if (parsed.type === "done") {
                const content = questionsContent
                  ? `${documentContent}\n\n${questionsContent}`
                  : documentContent;
                setFinalContent(content);
                setStreamingMessage("");
              }
            } catch (e) {
              console.error("[VignetteDetailView] Parse error:", e);
            }
          }
        }
      } else {
        const json = await response.json();
        const content = json.text || json.content || "";
        if (content) setFinalContent(content);
      }
    } catch (error) {
      console.error("[VignetteDetailView] Error streaming:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (messageText?: string) => {
    const userInput = messageText || input;
    if (!userInput.trim() || isLoading) return;
    setInput("");
    setIsLoading(true);

    try {
      const title =
        userInput.length > 50 ? userInput.substring(0, 50) + "..." : userInput;

      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, model: selectedModel }),
      });

      if (!response.ok) throw new Error("Failed to create conversation");
      const data = await response.json();
      const newConversationId = data.conversation.id;

      if (finalContent) {
        sessionStorage.setItem(
          "pendingVignetteContent",
          JSON.stringify({ text: finalContent, vignetteCategory }),
        );
        fetch(`/api/conversations/${newConversationId}/vignette-content`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ content: finalContent, vignetteCategory }],
          }),
        }).catch((e) =>
          console.error("[VignetteDetailView] Error saving vignette content:", e),
        );
      }

      sessionStorage.setItem(
        "pendingChatMessage",
        JSON.stringify({ content: userInput, scrollToTop: true }),
      );

      window.dispatchEvent(new Event("refreshConversations"));
      router.push(`/chat/${newConversationId}`);
    } catch (error) {
      console.error("[VignetteDetailView] Error creating conversation:", error);
      setIsLoading(false);
    }
  };

  const handleBackToCategory = (category: string) => {
    router.push(`/chat?category=${category}`);
  };

  const displayContent = finalContent || streamingMessage;
  const categoryName = vignetteCategory
    ? CATEGORY_DISPLAY_NAMES[vignetteCategory]
    : undefined;

  return (
    <div className="relative flex-1 bg-[rgb(249,248,244)] dark:bg-[rgb(1,1,0)] px-6 overflow-y-auto">
      <div className="w-full max-w-4xl flex flex-col items-center py-10 mx-auto">
        {displayContent ? (
          <div className="w-full max-w-5xl space-y-6 mb-8">
            <div className="flex gap-2 sm:gap-4 items-start justify-start">
              <AIAvatar />
              <div className="max-w-[90vw] sm:max-w-3xl lg:max-w-4xl px-3 sm:px-4 py-4 sm:py-5 rounded-2xl overflow-hidden bg-[rgb(249,248,244)] dark:bg-[rgb(1,1,0)] text-gray-900 dark:text-white">
                <Suspense
                  fallback={
                    <div className="text-base text-gray-400">Loading...</div>
                  }
                >
                  <Markdown
                    content={displayContent}
                    className="text-base"
                    categoryName={categoryName}
                    onCategoryClick={
                      vignetteCategory
                        ? () => handleBackToCategory(vignetteCategory)
                        : undefined
                    }
                  />
                </Suspense>
              </div>
            </div>
          </div>
        ) : isLoading ? (
          <div className="w-full max-w-5xl space-y-6 mb-8">
            <div className="flex gap-2 sm:gap-4 items-start justify-start">
              <AIAvatar />
              <div className="flex items-center gap-2 px-4 py-4">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <ChatInput
          input={input}
          setInput={setInput}
          handleSend={handleSend}
          isLoading={isLoading}
          userStatus={userStatus}
          selectedAgent={selectedAgent}
          onAgentChange={onAgentChange}
          className="max-w-3xl"
        />
      </div>
    </div>
  );
}
