import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Message,
  PendingMessage,
  PendingVignetteStream,
  PendingMarkdownStream,
  MarketplaceData,
} from "@/types/chat";
import { VignetteData } from "@/types/vignettes";
import { ClothesSearchData } from "@/components/ClothesSearchCard";
import { JewelrySearchData } from "@/components/JewelryCard";
import { CarsSearchData } from "@/components/CarsCard";
import { WatchesSearchData } from "@/components/WatchesCard";

export type { Message };

interface UseChatConversationProps {
  conversationId: number | null;
  selectedModel?: string;
  selectedAgent?: string;
}

const PENDING_MESSAGE_KEY = "pendingChatMessage";
const PENDING_VIGNETTE_CONTENT_KEY = "pendingVignetteContent";
const PENDING_MARKDOWN_STREAM_KEY = "pendingMarkdownStream";
const PENDING_SCROLL_TO_TOP_KEY = "pendingScrollToTop";
const PENDING_VIGNETTE_STREAM_KEY = "pendingVignetteStream";

export function useChatConversation({
  conversationId,
  selectedModel = "anthropic/claude-3.7-sonnet",
  selectedAgent = "discover",
}: UseChatConversationProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [streamingMarketplaceData, setStreamingMarketplaceData] =
    useState<MarketplaceData | null>(null);
  const [streamingRealEstateData, setStreamingRealEstateData] = useState<
    import("@/types/chat").RealEstateData | null
  >(null);
  const [streamingVignetteData, setStreamingVignetteData] = useState<
    VignetteData[] | null
  >(null);
  const [streamingClothesSearchData, setStreamingClothesSearchData] =
    useState<ClothesSearchData | null>(null);
  const [streamingJewelrySearchData, setStreamingJewelrySearchData] =
    useState<JewelrySearchData | null>(null);
  const [streamingCarsSearchData, setStreamingCarsSearchData] =
    useState<CarsSearchData | null>(null);
  const [streamingWatchesSearchData, setStreamingWatchesSearchData] =
    useState<WatchesSearchData | null>(null);
  const [streamingVignetteCategory, setStreamingVignetteCategory] = useState<
    string | null
  >(null);
  const [currentStatus, setCurrentStatus] = useState("");
  const [lastStreamingActivity, setLastStreamingActivity] = useState<number>(0);
  const [showStreamingIndicator, setShowStreamingIndicator] = useState(false);
  const [lastUserMessageId, setLastUserMessageId] = useState<number | null>(
    null,
  );
  const [shouldScrollToTop, setShouldScrollToTop] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const disableAutoScrollRef = useRef(
    typeof window !== "undefined" &&
      sessionStorage.getItem("disableAutoScroll") === "true",
  );
  const pendingMessageProcessedRef = useRef(false);
  const lastProcessedConversationIdRef = useRef<number | null>(null);
  const scrollToTopIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshConversations = useCallback(() => {
    window.dispatchEvent(new Event("refreshConversations"));
  }, []);

  const loadConversation = useCallback(
    async (id: number) => {
      try {
        const response = await fetch(`/api/conversations/${id}`);
        if (response.ok) {
          const data = await response.json();
          const msgs = data.messages || [];
          setMessages(msgs);
        } else if (response.status === 404) {
          console.error("Conversation not found, redirecting to home");
          router.push("/");
        }
      } catch (error) {
        console.error("Error loading conversation:", error);
        router.push("/");
      }
    },
    [router],
  );

  const streamMarkdown = useCallback(
    async (
      type: "independant" | "dependant-without-sub" | "dependant-with-sub",
      params: Record<string, string>,
      options?: { userPrompt?: string; scrollToTop?: boolean },
    ): Promise<boolean> => {
      if (!conversationId) {
        try {
          const title = options?.userPrompt || "New Chat";
          const response = await fetch("/api/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, model: selectedModel }),
          });

          if (response.ok) {
            const data = await response.json();
            const newId = data.conversation.id;

            const pendingStream: PendingMarkdownStream = {
              type,
              params,
              options,
            };
            sessionStorage.setItem(
              PENDING_MARKDOWN_STREAM_KEY,
              JSON.stringify(pendingStream),
            );

            refreshConversations();
            router.push(`/chat/${newId}`);
            return true;
          }
        } catch (error) {
          console.error("[streamMarkdown] Error creating conversation:", error);
        }
        return false;
      }

      setIsLoading(true);
      setStreamingMessage("");
      setStreamingVignetteCategory(
        params.category || params.sub_category || null,
      );

      if (options?.userPrompt) {
        const userMsg: Message = {
          id: Date.now(),
          content: options.userPrompt,
          sender: "user",
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, userMsg]);

        if (options.scrollToTop) {
          setLastUserMessageId(userMsg.id);
          setShouldScrollToTop(true);
          disableAutoScrollRef.current = true;
          sessionStorage.setItem("disableAutoScroll", "true");
        }
      }

      try {
        const query = new URLSearchParams({ type, ...params });
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
                } else if (parsed.type === "status") {
                  setCurrentStatus(parsed.message || "");
                } else if (parsed.type === "questions_chunk") {
                  questionsContent += parsed.content || "";
                  setStreamingMessage(
                    documentContent + "\n\n" + questionsContent,
                  );
                } else if (parsed.type === "done") {
                  const allQuestions = questionsContent || parsed.questions || "";
                  const finalContent = allQuestions
                    ? `${documentContent}\n\n${allQuestions}`
                    : documentContent;

                  const aiMessage: Message = {
                    id: Date.now(),
                    content: finalContent,
                    sender: "ai",
                    created_at: new Date().toISOString(),
                    vignetteCategory: params.category || params.sub_category,
                  };

                  const saveToDb = async (convId: number) => {
                    try {
                      await fetch(
                        `/api/conversations/${convId}/vignette-content`,
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            messages: [
                              {
                                content: finalContent,
                                vignetteCategory:
                                  params.category || params.sub_category,
                              },
                            ],
                          }),
                        },
                      );
                    } catch (e) {
                      console.error(
                        "[Markdown SSE] Error saving to database:",
                        e,
                      );
                    }
                  };

                  if (conversationId) {
                    setMessages((prev) => [...prev, aiMessage]);
                    saveToDb(conversationId);
                  } else {
                    setMessages((prev) => [...prev, aiMessage]);
                  }
                  setStreamingMessage("");
                  setCurrentStatus("");
                }
              } catch (e) {
                console.error("[Markdown Stream] Parse error:", e);
              }
            }
          }
        } else {
          const jsonResponse = await response.json();
          const textContent = jsonResponse.text || jsonResponse.content || "";
          const questionsContent = jsonResponse.questions || "";
          const content = questionsContent
            ? `${textContent}\n\n${questionsContent}`
            : textContent;

          if (content) {
            const aiMessage: Message = {
              id: Date.now(),
              content: content,
              sender: "ai",
              created_at: new Date().toISOString(),
              vignetteCategory: params.category || params.sub_category,
            };

            if (conversationId) {
              setMessages((prev) => [...prev, aiMessage]);
              await fetch(
                `/api/conversations/${conversationId}/vignette-content`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    messages: [
                      {
                        content: content,
                        vignetteCategory:
                          params.category || params.sub_category,
                      },
                    ],
                  }),
                },
              );
            } else {
              setMessages((prev) => [...prev, aiMessage]);
            }
          }
        }

        setIsLoading(false);
        return true;
      } catch (error) {
        console.error("[streamMarkdown] Error:", error);
        setIsLoading(false);
        setStreamingMessage("");
        return false;
      }
    },
    [conversationId, selectedModel, router, refreshConversations],
  );

  const streamVignetteMarkdown = useCallback(
    async (
      imageName: string,
      category?: string,
      tier?: string,
    ): Promise<boolean> => {
      if (category === "CASH_FLOW_LEASING") {
        return streamMarkdown("dependant-without-sub", {
          category: "CASH_FLOW_LEASING",
          markdown_name: imageName,
          tiers_level: tier || "DISCOVER",
        });
      }

      return streamMarkdown("independant", {
        root_folder: "VIGNETTES",
        markdown_name: imageName,
        category: category || "",
      });
    },
    [streamMarkdown],
  );

  const sendMessageToApi = useCallback(
    async (
      targetConversationId: number,
      userInput: string,
      flashCards?: string,
      flashCardType?: "flash_invest" | "ranking" | "portfolio" | "PORTFOLIO",
      scrollToTop: boolean = true,
      uuidProduct?: string,
      productCategory?: string,
      agentType?: string,
    ) => {
      setIsLoading(true);
      setStreamingMessage("");
      setStreamingMarketplaceData(null);
      setStreamingRealEstateData(null);
      setStreamingVignetteData(null);
      setStreamingClothesSearchData(null);
      setStreamingJewelrySearchData(null);
      setCurrentStatus("");
      setLastStreamingActivity(Date.now());
      setShowStreamingIndicator(false);

      const tempUserMessage: Message = {
        id: Date.now(),
        content: userInput,
        sender: "user",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUserMessage]);

      if (scrollToTop) {
        setLastUserMessageId(tempUserMessage.id);
        setShouldScrollToTop(true);
        disableAutoScrollRef.current = true;
        sessionStorage.setItem("disableAutoScroll", "true");
      }

      try {
        const response = await fetch(
          `/api/conversations/${targetConversationId}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: userInput,
              agent_type: agentType || selectedAgent,
              ...(flashCards ? { flash_cards: flashCards } : {}),
              flash_card_type: flashCardType,
              ...(uuidProduct ? { uuid_product: uuidProduct } : {}),
              ...(productCategory ? { product_category: productCategory } : {}),
            }),
          },
        );

        if (!response.ok) throw new Error("Failed to send message");
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new Error("No response stream");

        let streamContent = "";
        let sseBuffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          const sseEvents = sseBuffer.split("\n\n");
          sseBuffer = sseEvents.pop() || "";

          for (const event of sseEvents) {
            if (!event.trim()) continue;
            let cleanedLine = "";
            for (const line of event.split("\n")) {
              if (line.startsWith("data: ")) cleanedLine += line.slice(6);
            }
            if (!cleanedLine) continue;

            try {
              const data = JSON.parse(cleanedLine);
              if (data.type === "chunk") {
                streamContent += data.content;
                setStreamingMessage(streamContent);
                setLastStreamingActivity(Date.now());
                setCurrentStatus("");
              } else if (data.type === "marketplace_data") {
                let marketplacePayload = data.data;
                if (typeof marketplacePayload === "string") {
                  try {
                    marketplacePayload = JSON.parse(marketplacePayload);
                  } catch {
                    /* keep as-is */
                  }
                }
                setShouldScrollToTop(false);
                setStreamingMarketplaceData(marketplacePayload);
              } else if (data.type === "real_estate_data") {
                setShouldScrollToTop(false);
                setStreamingRealEstateData(data.data);
              } else if (data.type === "vignette_data") {
                setStreamingVignetteData(data.data);
              } else if (data.type === "clothes_data" && data.data?.listings) {
                setShouldScrollToTop(false);
                setStreamingClothesSearchData(data.data);
              } else if (data.type === "jewelry_data" && data.data?.listings) {
                setShouldScrollToTop(false);
                setStreamingJewelrySearchData(data.data);
              } else if (data.type === "cars_data" && data.data?.listings) {
                setShouldScrollToTop(false);
                setStreamingCarsSearchData(data.data);
              } else if (data.type === "watches_data" && data.data?.listings) {
                setShouldScrollToTop(false);
                setStreamingWatchesSearchData(data.data);
              } else if (
                data.type === "done" ||
                (data.type === "artist_info" &&
                  (data.userMessage || data.aiMessage))
              ) {
                await loadConversation(targetConversationId);
                setStreamingMessage("");
                setStreamingMarketplaceData(null);
                setStreamingRealEstateData(null);
                setStreamingVignetteData(null);
                setStreamingClothesSearchData(null);
                setStreamingJewelrySearchData(null);
                setStreamingCarsSearchData(null);
                setStreamingWatchesSearchData(null);
                setCurrentStatus("");
              } else if (data.type === "status") {
                setCurrentStatus(data.message);
                setLastStreamingActivity(Date.now());
              }
            } catch (error) {
              console.error("Error parsing SSE event:", error);
            }
          }
        }
      } catch (error) {
        console.error("Error sending message:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [loadConversation, selectedAgent],
  );

  // Main useEffect for pending logic and initialization
  useEffect(() => {
    if (conversationId) {
      if (conversationId !== lastProcessedConversationIdRef.current) {
        pendingMessageProcessedRef.current = false;
        lastProcessedConversationIdRef.current = conversationId;
        setShouldScrollToTop(false);
        setShouldAutoScroll(false);
        setLastUserMessageId(null);
      }

      if (pendingMessageProcessedRef.current) {
        return;
      }

      // Priority 1: Pending Vignette Stream
      const pendingVignetteStreamStr = sessionStorage.getItem(
        PENDING_VIGNETTE_STREAM_KEY,
      );
      if (pendingVignetteStreamStr) {
        pendingMessageProcessedRef.current = true;
        sessionStorage.removeItem(PENDING_VIGNETTE_STREAM_KEY);
        try {
          const pendingStream: PendingVignetteStream = JSON.parse(
            pendingVignetteStreamStr,
          );
          streamVignetteMarkdown(
            pendingStream.imageName,
            pendingStream.category,
            pendingStream.tier,
          );
        } catch (e) {
          console.error(e);
          loadConversation(conversationId);
        }
        return;
      }

      // Priority 2: Pending Markdown Stream
      const pendingMarkdownStreamStr = sessionStorage.getItem(
        PENDING_MARKDOWN_STREAM_KEY,
      );
      if (pendingMarkdownStreamStr) {
        pendingMessageProcessedRef.current = true;
        sessionStorage.removeItem(PENDING_MARKDOWN_STREAM_KEY);
        try {
          const pendingStream: PendingMarkdownStream = JSON.parse(
            pendingMarkdownStreamStr,
          );
          streamMarkdown(
            pendingStream.type,
            pendingStream.params,
            pendingStream.options,
          );
        } catch (e) {
          console.error(e);
          loadConversation(conversationId);
        }
        return;
      }

      // Priority 3: Pending User Message
      const pendingMessageStr = sessionStorage.getItem(PENDING_MESSAGE_KEY);
      if (pendingMessageStr) {
        pendingMessageProcessedRef.current = true;
        sessionStorage.removeItem(PENDING_MESSAGE_KEY);

        // Also pre-load any vignette content that was displayed before the chat
        const pendingVignetteContentStr = sessionStorage.getItem(
          PENDING_VIGNETTE_CONTENT_KEY,
        );
        if (pendingVignetteContentStr) {
          sessionStorage.removeItem(PENDING_VIGNETTE_CONTENT_KEY);
          try {
            const parsed = JSON.parse(pendingVignetteContentStr);
            const text = parsed.text || pendingVignetteContentStr;
            if (text) {
              setMessages([
                {
                  id: -Date.now(), // negative to avoid collision with user message id
                  content: text,
                  sender: "ai" as const,
                  created_at: new Date().toISOString(),
                  vignetteCategory: parsed.vignetteCategory,
                },
              ]);
            }
          } catch {
            /* ignore */
          }
        }

        try {
          const pendingMessage: PendingMessage = JSON.parse(pendingMessageStr);
          sendMessageToApi(
            conversationId,
            pendingMessage.content,
            pendingMessage.flashCards,
            pendingMessage.flashCardType,
            pendingMessage.scrollToTop,
            pendingMessage.uuidProduct,
            pendingMessage.productCategory,
            pendingMessage.agentType,
          );
        } catch (e) {
          console.error(e);
          loadConversation(conversationId);
        }
        return;
      }

      // Priority 4: Pending Vignette Content
      const pendingVignetteContent = sessionStorage.getItem(
        PENDING_VIGNETTE_CONTENT_KEY,
      );
      if (pendingVignetteContent) {
        pendingMessageProcessedRef.current = true;
        sessionStorage.removeItem(PENDING_VIGNETTE_CONTENT_KEY);

        const saveVignetteMessages = async (
          msgs: { content: string; vignetteCategory?: string }[],
        ) => {
          try {
            await fetch(
              `/api/conversations/${conversationId}/vignette-content`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: msgs }),
              },
            );
          } catch (e) {
            console.error(e);
          }
        };

        try {
          const parsed = JSON.parse(pendingVignetteContent);
          if (parsed.text) {
            const messagesToSave = [
              {
                content: parsed.text,
                vignetteCategory: parsed.vignetteCategory,
              },
            ];
            if (parsed.questions)
              messagesToSave.push({
                content: parsed.questions,
                vignetteCategory: parsed.vignetteCategory,
              });
            setMessages(
              messagesToSave.map((m, i) => ({
                id: Date.now() + i,
                content: m.content,
                sender: "ai" as const,
                created_at: new Date().toISOString(),
              })),
            );
            saveVignetteMessages(messagesToSave);
            return;
          }
        } catch {
          /* ignore */
        }
        setMessages([
          {
            id: Date.now(),
            content: pendingVignetteContent,
            sender: "ai",
            created_at: new Date().toISOString(),
          },
        ]);
        saveVignetteMessages([{ content: pendingVignetteContent }]);
        return;
      }

      loadConversation(conversationId);
    } else {
      setMessages([]);
      pendingMessageProcessedRef.current = false;
      lastProcessedConversationIdRef.current = null;
    }

    const shouldDisableScroll =
      sessionStorage.getItem("disableAutoScroll") === "true";
    if (shouldDisableScroll) {
      disableAutoScrollRef.current = true;
      setTimeout(() => {
        sessionStorage.removeItem("disableAutoScroll");
        disableAutoScrollRef.current = false;
      }, 30000);
    }

    if (sessionStorage.getItem(PENDING_SCROLL_TO_TOP_KEY) === "true") {
      setShouldScrollToTop(true);
      sessionStorage.removeItem(PENDING_SCROLL_TO_TOP_KEY);
    }

    if (sessionStorage.getItem("pendingScrollToTopVignette") === "true") {
      messagesContainerRef.current?.scrollTo({
        top: 0,
        behavior: "smooth",
      });
      sessionStorage.removeItem("pendingScrollToTopVignette");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    conversationId,
    loadConversation,
    sendMessageToApi,
    streamVignetteMarkdown,
  ]);

  // Auto-scroll and scroll to top
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    const hasVignetteData =
      lastMessage?.vignette_data && lastMessage.vignette_data.length > 0;
    const isScrollDisabled =
      disableAutoScrollRef.current ||
      sessionStorage.getItem("disableAutoScroll") === "true";

    if (
      shouldScrollToTop &&
      lastUserMessageId &&
      messagesContainerRef.current
    ) {
      const container = messagesContainerRef.current;
      const element = container.querySelector(
        `[data-message-id="${lastUserMessageId}"]`,
      ) as HTMLElement;
      if (element) {
        if (scrollToTopIntervalRef.current) {
          clearInterval(scrollToTopIntervalRef.current);
          scrollToTopIntervalRef.current = null;
        }
        const getScrollTarget = () => {
          if (!element.isConnected) return null;
          return (
            container.scrollTop +
            (element.getBoundingClientRect().top -
              container.getBoundingClientRect().top)
          );
        };
        const target = getScrollTarget();
        if (target !== null) container.scrollTo({ top: target, behavior: "smooth" });
        scrollToTopIntervalRef.current = setInterval(() => {
          const t = getScrollTarget();
          if (t === null) {
            clearInterval(scrollToTopIntervalRef.current!);
            scrollToTopIntervalRef.current = null;
            setShouldScrollToTop(false);
            disableAutoScrollRef.current = false;
            setShouldAutoScroll(true);
            return;
          }
          container.scrollTo({ top: t, behavior: "smooth" });
        }, 400);
        const timeout = setTimeout(() => {
          if (scrollToTopIntervalRef.current) {
            clearInterval(scrollToTopIntervalRef.current);
            scrollToTopIntervalRef.current = null;
          }
          setShouldScrollToTop(false);
          disableAutoScrollRef.current = false;
          setShouldAutoScroll(true);
        }, 2000);
        return () => {
          clearTimeout(timeout);
          if (scrollToTopIntervalRef.current) {
            clearInterval(scrollToTopIntervalRef.current);
            scrollToTopIntervalRef.current = null;
          }
        };
      }
    } else if (shouldAutoScroll && !hasVignetteData && !isScrollDisabled) {
      const container = messagesContainerRef.current;
      if (container) {
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      }
    }
  }, [
    messages,
    streamingMessage,
    streamingMarketplaceData,
    streamingRealEstateData,
    streamingVignetteData,
    streamingClothesSearchData,
    streamingJewelrySearchData,
    streamingCarsSearchData,
    streamingWatchesSearchData,
    isLoading,
    shouldAutoScroll,
    shouldScrollToTop,
    lastUserMessageId,
  ]);

  // Streaming indicator logic
  useEffect(() => {
    if (!isLoading) {
      setShowStreamingIndicator(false);
      return;
    }
    const interval = setInterval(() => {
      const timeSinceLastActivity = Date.now() - lastStreamingActivity;
      setShowStreamingIndicator(
        Boolean(isLoading && streamingMessage && timeSinceLastActivity > 500),
      );
    }, 300);
    return () => clearInterval(interval);
  }, [isLoading, streamingMessage, lastStreamingActivity]);

  const handleSend = async (
    messageToSend?: string,
    flashCards?: string,
    flashCardType?: "flash_invest" | "ranking" | "portfolio" | "PORTFOLIO",
    scrollToTop: boolean = true,
    uuidProduct?: string,
    productCategory?: string,
  ) => {
    const userInput = messageToSend || input;
    if (!userInput.trim() || isLoading) return;
    setInput("");

    if (conversationId) {
      await sendMessageToApi(
        conversationId,
        userInput,
        flashCards,
        flashCardType,
        scrollToTop,
        uuidProduct,
        productCategory,
        selectedAgent,
      );
      return;
    }

    setIsLoading(true);
    const messageId = Date.now();
    setMessages((prev) => [
      ...prev,
      {
        id: messageId,
        content: userInput,
        sender: "user",
        created_at: new Date().toISOString(),
      },
    ]);

    if (scrollToTop) {
      setLastUserMessageId(messageId);
      setShouldScrollToTop(true);
      sessionStorage.setItem(PENDING_SCROLL_TO_TOP_KEY, "true");
    }

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

      sessionStorage.setItem(
        PENDING_MESSAGE_KEY,
        JSON.stringify({
          content: userInput,
          flashCards,
          flashCardType,
          scrollToTop,
          uuidProduct,
          productCategory,
          agentType: selectedAgent,
        }),
      );
      refreshConversations();
      router.push(`/chat/${newConversationId}`);
    } catch (error) {
      console.error("Error creating conversation:", error);
      setIsLoading(false);
    }
  };

  const handleFlashcardClick = (
    flashCards: string,
    question: string,
    flashCardType: "flash_invest" | "ranking" | "portfolio" | "PORTFOLIO",
    displayName: string,
    tier: string = "DISCOVER",
  ) => {
    const tierUpper = tier.toUpperCase();

    if (flashCardType === "flash_invest" || flashCardType === "ranking") {
      streamMarkdown(
        "dependant-with-sub",
        {
          category: "RANKING",
          sub_category: flashCards.toUpperCase(),
          tiers_level: tierUpper,
        },
        { userPrompt: displayName, scrollToTop: true },
      );
    } else if (flashCardType === "portfolio" || flashCardType === "PORTFOLIO") {
      if (flashCards) {
        streamMarkdown(
          "dependant-without-sub",
          {
            category: "PORTFOLIO",
            markdown_name: flashCards,
            tiers_level: tierUpper,
          },
          { userPrompt: displayName, scrollToTop: true },
        );
      } else {
        streamMarkdown(
          "dependant-without-sub",
          {
            category: "PORTFOLIO",
            tiers_level: tierUpper,
          },
          { userPrompt: displayName, scrollToTop: true },
        );
      }
    }
  };

  const addAiMessage = async (content: string) => {
    const aiMessage: Message = {
      id: Date.now(),
      content,
      sender: "ai",
      created_at: new Date().toISOString(),
    };
    if (conversationId || process.env.NEXT_PUBLIC_SKIP_AUTH === "true") {
      setMessages((prev) => [...prev, aiMessage]);
      return;
    }
    try {
      const title =
        content.length > 50 ? content.substring(0, 50) + "..." : content;
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, model: selectedModel }),
      });
      if (!response.ok) throw new Error("Failed to create conversation");
      const data = await response.json();
      sessionStorage.setItem(
        PENDING_VIGNETTE_CONTENT_KEY,
        JSON.stringify({ text: content }),
      );
      refreshConversations();
      router.push(`/chat/${data.conversation.id}`);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return {
    messages,
    input,
    setInput,
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
    disableAutoScrollRef,
    lastUserMessageId,
    shouldScrollToTop,
    setShouldScrollToTop,
    handleSend,
    handleFlashcardClick,
    handleScroll: () => {
      const container = messagesContainerRef.current;
      if (container)
        setShouldAutoScroll(
          container.scrollHeight -
            container.scrollTop -
            container.clientHeight <
            20,
        );
    },
    addAiMessage,
    streamVignetteMarkdown,
    streamMarkdown,
    clearMessages: useCallback(() => {
      setMessages([]);
      setStreamingMessage("");
      setStreamingMarketplaceData(null);
      setStreamingRealEstateData(null);
      setStreamingVignetteData(null);
      setStreamingClothesSearchData(null);
      setStreamingJewelrySearchData(null);
      setStreamingVignetteCategory(null);
      setCurrentStatus("");
      setShowStreamingIndicator(false);
    }, []),
  };
}
