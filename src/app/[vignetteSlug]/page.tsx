"use client";

import { useEffect, useState, useRef, lazy, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useI18n } from "@/contexts/i18n-context";
import { LOGO_DARK, LOGO_LIGHT } from "@/lib/constants/logos";
import { ChatInput } from "@/components/chat-input";
import { AIAvatar } from "@/components/chat/AIAvatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AgentType, getAvailableAgents } from "@/types/agents";
import { getCategoryDisplayNames } from "@/lib/translations";
import { DEFAULT_NON_ADMIN_MODEL } from "@/lib/models";
import Image from "next/image";

const Markdown = lazy(() =>
  import("@/components/Markdown").then((mod) => ({ default: mod.Markdown })),
);

const PENDING_VIGNETTE_VIEW_KEY = "pendingVignetteView";

interface VignetteViewParams {
  imageName: string;
  category: string;
  tier: string;
}

export default function VignettePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === "dark" || resolvedTheme === "dark";
  const { t, language } = useI18n();
  const categoryNames = getCategoryDisplayNames(language);

  const [mounted, setMounted] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentType>("discover");
  const [selectedModel] = useState<string>(DEFAULT_NON_ADMIN_MODEL);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [finalContent, setFinalContent] = useState("");
  const [vignetteCategory, setVignetteCategory] = useState<
    string | undefined
  >();

  const streamStartedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    const savedAgent = localStorage.getItem("selectedAgent");
    if (
      savedAgent &&
      ["discover", "intelligence", "oracle"].includes(savedAgent)
    ) {
      setSelectedAgent(savedAgent as AgentType);
    }
  }, []);

  // Auth redirect
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SKIP_AUTH === "true") return;
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (
      status === "authenticated" &&
      (session?.user as { status?: string })?.status === "unauthorized"
    ) {
      router.push("/registration-pending");
    }
  }, [status, session, router]);

  // Stream vignette content on mount
  useEffect(() => {
    if (!mounted || streamStartedRef.current) return;

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
  }, [mounted]);

  const streamVignetteContent = async (vignetteParams: VignetteViewParams) => {
    setIsLoading(true);
    setStreamingMessage("");

    try {
      const queryParams: Record<string, string> = {
        type: "independant",
        root_folder: "VIGNETTES",
        markdown_name: vignetteParams.imageName,
        category: vignetteParams.category || "",
      };

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
                setStreamingMessage(
                  documentContent + "\n\n" + questionsContent,
                );
              } else if (parsed.type === "done") {
                const content = questionsContent
                  ? `${documentContent}\n\n${questionsContent}`
                  : documentContent;
                setFinalContent(content);
                setStreamingMessage("");
              }
            } catch (e) {
              console.error("[VignettePage] Parse error:", e);
            }
          }
        }
      } else {
        const json = await response.json();
        const content = json.text || json.content || "";
        if (content) setFinalContent(content);
      }
    } catch (error) {
      console.error("[VignettePage] Error streaming:", error);
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

      // Store vignette content in sessionStorage so the chat page displays it
      // immediately, and save to DB for AI context
      if (finalContent) {
        sessionStorage.setItem(
          "pendingVignetteContent",
          JSON.stringify({ text: finalContent, vignetteCategory }),
        );
        // Fire-and-forget DB save for AI context (navigation won't wait)
        fetch(`/api/conversations/${newConversationId}/vignette-content`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ content: finalContent, vignetteCategory }],
          }),
        }).catch((e) =>
          console.error("[VignettePage] Error saving vignette content:", e),
        );
      }

      // Store user message to be sent after navigation
      sessionStorage.setItem(
        "pendingChatMessage",
        JSON.stringify({ content: userInput, scrollToTop: true }),
      );

      window.dispatchEvent(new Event("refreshConversations"));
      router.push(`/chat/${newConversationId}`);
    } catch (error) {
      console.error("[VignettePage] Error creating conversation:", error);
      setIsLoading(false);
    }
  };

  const handleAgentChange = (agent: AgentType) => {
    setSelectedAgent(agent);
    localStorage.setItem("selectedAgent", agent);
  };

  const handleBackToCategory = (category: string) => {
    router.push(`/chat?category=${category}`);
  };

  const userStatus = (session?.user as { status?: string })?.status as
    | "unauthorized"
    | "free"
    | "paid"
    | "admini"
    | "discover"
    | "intelligence"
    | "oracle"
    | undefined;

  const displayContent = finalContent || streamingMessage;
  const categoryName = vignetteCategory
    ? categoryNames[vignetteCategory]
    : undefined;

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-[rgb(249,248,244)] dark:bg-[rgb(1,1,0)]">
        <div className="text-center">
          <div className="w-64 h-32 mx-auto mb-4 flex items-center justify-center animate-pulse">
            <Image
              src={
                mounted && isDark
                  ? LOGO_DARK
                  : LOGO_LIGHT
              }
              alt="Prophetic Orchestra"
              width={256}
              height={64}
              className="w-full h-full object-contain"
            />
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            {t("chat.loading")}
          </p>
        </div>
      </div>
    );
  }

  if (!session && process.env.NEXT_PUBLIC_SKIP_AUTH !== "true") {
    return null;
  }

  return (
    <>
      <div className="h-[56px] mb-4 flex-shrink-0 border-b border-gray-400 dark:border-gray-800" />
      <div className="absolute top-2 right-3 z-20">
        <ThemeToggle />
      </div>

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
            onAgentChange={handleAgentChange}
            className="max-w-3xl"
          />
        </div>
      </div>
    </>
  );
}
