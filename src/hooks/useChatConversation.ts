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
import { WhiskySearchData } from "@/components/WhiskyCard";
import { WineSearchData } from "@/components/WineCard";
import { CardsSearchData } from "@/components/SportsCardsCard";
import { STORAGE_KEYS } from "@/lib/constants/storage-keys";

export type { Message };

export interface HandleSendOptions {
  message?: string;
  flashCards?: string;
  flashCardType?: "flash_invest" | "ranking" | "portfolio" | "PORTFOLIO";
  scrollToTop?: boolean;
  uuidProduct?: string;
  productCategory?: string;
}

interface UseChatConversationProps {
  conversationId: number | null;
  selectedModel?: string;
  selectedAgent?: string;
}

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
  const [streamingWhiskySearchData, setStreamingWhiskySearchData] =
    useState<WhiskySearchData | null>(null);
  const [streamingWineSearchData, setStreamingWineSearchData] =
    useState<WineSearchData | null>(null);
  const [streamingCardsSearchData, setStreamingCardsSearchData] =
    useState<CardsSearchData | null>(null);
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
      sessionStorage.getItem(STORAGE_KEYS.DISABLE_AUTO_SCROLL) === "true",
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
              STORAGE_KEYS.PENDING_MARKDOWN_STREAM,
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
          sessionStorage.setItem(STORAGE_KEYS.DISABLE_AUTO_SCROLL, "true");
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
          let streamingJewelryData: JewelrySearchData | null = null;
          let streamingClothesData: ClothesSearchData | null = null;
          let streamingCarsData: CarsSearchData | null = null;
          let streamingWatchesData: WatchesSearchData | null = null;
          let streamingWhiskyData: WhiskySearchData | null = null;
          let streamingWineData: WineSearchData | null = null;
          let streamingCardsData: CardsSearchData | null = null;
          let streamingMktData: MarketplaceData | null = null;
          let streamingREData: import("@/types/chat").RealEstateData | null = null;

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
                } else if (parsed.type === "markdown") {
                  documentContent = parsed.text || "";
                  setStreamingMessage(documentContent);
                } else if (parsed.type === "jewelry_data") {
                  if ((parsed.data as JewelrySearchData)?.listings) {
                    streamingJewelryData = parsed.data as JewelrySearchData;
                    setStreamingJewelrySearchData(streamingJewelryData);
                  }
                } else if (parsed.type === "clothes_data") {
                  if ((parsed.data as ClothesSearchData)?.listings) {
                    streamingClothesData = parsed.data as ClothesSearchData;
                    setStreamingClothesSearchData(streamingClothesData);
                  }
                } else if (parsed.type === "cars_data") {
                  if ((parsed.data as CarsSearchData)?.listings) {
                    streamingCarsData = parsed.data as CarsSearchData;
                    setStreamingCarsSearchData(streamingCarsData);
                  }
                } else if (parsed.type === "watches_data") {
                  if ((parsed.data as WatchesSearchData)?.listings) {
                    streamingWatchesData = parsed.data as WatchesSearchData;
                    setStreamingWatchesSearchData(streamingWatchesData);
                  }
                } else if (parsed.type === "whisky_data") {
                  if ((parsed.data as WhiskySearchData)?.listings) {
                    streamingWhiskyData = parsed.data as WhiskySearchData;
                    setStreamingWhiskySearchData(streamingWhiskyData);
                  }
                } else if (parsed.type === "wine_data") {
                  if ((parsed.data as WineSearchData)?.listings) {
                    streamingWineData = parsed.data as WineSearchData;
                    setStreamingWineSearchData(streamingWineData);
                  }
                } else if (parsed.type === "cards_data") {
                  if ((parsed.data as CardsSearchData)?.listings) {
                    streamingCardsData = parsed.data as CardsSearchData;
                    setStreamingCardsSearchData(streamingCardsData);
                  }
                } else if (parsed.type === "marketplace_data") {
                  streamingMktData = parsed.data as MarketplaceData;
                  setStreamingMarketplaceData(streamingMktData);
                } else if (parsed.type === "real_estate_data") {
                  streamingREData = parsed.data as import("@/types/chat").RealEstateData;
                  setStreamingRealEstateData(streamingREData);
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
                    ...(streamingJewelryData ? { jewelry_search_data: streamingJewelryData } : {}),
                    ...(streamingClothesData ? { clothes_search_data: streamingClothesData } : {}),
                    ...(streamingCarsData ? { cars_search_data: streamingCarsData } : {}),
                    ...(streamingWatchesData ? { watches_search_data: streamingWatchesData } : {}),
                    ...(streamingWhiskyData ? { whisky_search_data: streamingWhiskyData } : {}),
                    ...(streamingWineData ? { wine_search_data: streamingWineData } : {}),
                    ...(streamingCardsData ? { cards_search_data: streamingCardsData } : {}),
                    ...(streamingMktData ? { marketplace_data: streamingMktData } : {}),
                    ...(streamingREData ? { real_estate_data: streamingREData } : {}),
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
                  setStreamingMarketplaceData(null);
                  setStreamingRealEstateData(null);
                  setStreamingClothesSearchData(null);
                  setStreamingJewelrySearchData(null);
                  setStreamingCarsSearchData(null);
                  setStreamingWatchesSearchData(null);
                  setStreamingWhiskySearchData(null);
                  setStreamingWineSearchData(null);
                  setStreamingCardsSearchData(null);
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
        return_product: "true",
      });
    },
    [streamMarkdown],
  );

  /** Resets all streaming state back to initial values. */
  const resetStreamingState = useCallback(() => {
    setStreamingMessage("");
    setStreamingMarketplaceData(null);
    setStreamingRealEstateData(null);
    setStreamingVignetteData(null);
    setStreamingClothesSearchData(null);
    setStreamingJewelrySearchData(null);
    setStreamingCarsSearchData(null);
    setStreamingWatchesSearchData(null);
    setStreamingWhiskySearchData(null);
    setStreamingWineSearchData(null);
    setStreamingCardsSearchData(null);
    setCurrentStatus("");
  }, []);

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
      resetStreamingState();
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
        sessionStorage.setItem(STORAGE_KEYS.DISABLE_AUTO_SCROLL, "true");
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

        type SseHandler = (data: Record<string, unknown>) => void | Promise<void>;
        const sseHandlers: Record<string, SseHandler> = {
          chunk: (data) => {
            streamContent += data.content as string;
            setStreamingMessage(streamContent);
            setLastStreamingActivity(Date.now());
            setCurrentStatus("");
          },
          marketplace_data: (data) => {
            let payload = data.data;
            if (typeof payload === "string") {
              try { payload = JSON.parse(payload as string); } catch { /* keep as-is */ }
            }
            setShouldScrollToTop(false);
            setStreamingMarketplaceData(payload as MarketplaceData);
          },
          real_estate_data: (data) => {
            setShouldScrollToTop(false);
            setStreamingRealEstateData(data.data as import("@/types/chat").RealEstateData);
          },
          vignette_data: (data) => {
            setStreamingVignetteData(data.data as VignetteData[]);
          },
          clothes_data: (data) => {
            if ((data.data as ClothesSearchData)?.listings) {
              setShouldScrollToTop(false);
              setStreamingClothesSearchData(data.data as ClothesSearchData);
            }
          },
          jewelry_data: (data) => {
            if ((data.data as JewelrySearchData)?.listings) {
              setShouldScrollToTop(false);
              setStreamingJewelrySearchData(data.data as JewelrySearchData);
            }
          },
          cars_data: (data) => {
            if ((data.data as CarsSearchData)?.listings) {
              setShouldScrollToTop(false);
              setStreamingCarsSearchData(data.data as CarsSearchData);
            }
          },
          watches_data: (data) => {
            if ((data.data as WatchesSearchData)?.listings) {
              setShouldScrollToTop(false);
              setStreamingWatchesSearchData(data.data as WatchesSearchData);
            }
          },
          whisky_data: (data) => {
            if ((data.data as WhiskySearchData)?.listings) {
              setShouldScrollToTop(false);
              setStreamingWhiskySearchData(data.data as WhiskySearchData);
            }
          },
          wine_data: (data) => {
            if ((data.data as WineSearchData)?.listings) {
              setShouldScrollToTop(false);
              setStreamingWineSearchData(data.data as WineSearchData);
            }
          },
          cards_data: (data) => {
            if ((data.data as CardsSearchData)?.listings) {
              setShouldScrollToTop(false);
              setStreamingCardsSearchData(data.data as CardsSearchData);
            }
          },
          done: async () => {
            await loadConversation(targetConversationId);
            resetStreamingState();
          },
          artist_info: async (data) => {
            if (data.userMessage || data.aiMessage) {
              await loadConversation(targetConversationId);
              resetStreamingState();
            }
          },
          status: (_data) => {
            setLastStreamingActivity(Date.now());
          },
        };

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
              const handler = sseHandlers[data.type as string];
              if (handler) await handler(data);
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
    [loadConversation, selectedAgent, resetStreamingState],
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
        STORAGE_KEYS.PENDING_VIGNETTE_STREAM,
      );
      if (pendingVignetteStreamStr) {
        pendingMessageProcessedRef.current = true;
        sessionStorage.removeItem(STORAGE_KEYS.PENDING_VIGNETTE_STREAM);
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
        STORAGE_KEYS.PENDING_MARKDOWN_STREAM,
      );
      if (pendingMarkdownStreamStr) {
        pendingMessageProcessedRef.current = true;
        sessionStorage.removeItem(STORAGE_KEYS.PENDING_MARKDOWN_STREAM);
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
      const pendingMessageStr = sessionStorage.getItem(STORAGE_KEYS.PENDING_MESSAGE);
      if (pendingMessageStr) {
        pendingMessageProcessedRef.current = true;
        sessionStorage.removeItem(STORAGE_KEYS.PENDING_MESSAGE);

        // Also pre-load any vignette content that was displayed before the chat
        const pendingVignetteContentStr = sessionStorage.getItem(
          STORAGE_KEYS.PENDING_VIGNETTE_CONTENT,
        );
        if (pendingVignetteContentStr) {
          sessionStorage.removeItem(STORAGE_KEYS.PENDING_VIGNETTE_CONTENT);
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
        STORAGE_KEYS.PENDING_VIGNETTE_CONTENT,
      );
      if (pendingVignetteContent) {
        pendingMessageProcessedRef.current = true;
        sessionStorage.removeItem(STORAGE_KEYS.PENDING_VIGNETTE_CONTENT);

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
      sessionStorage.getItem(STORAGE_KEYS.DISABLE_AUTO_SCROLL) === "true";
    if (shouldDisableScroll) {
      disableAutoScrollRef.current = true;
      setTimeout(() => {
        sessionStorage.removeItem(STORAGE_KEYS.DISABLE_AUTO_SCROLL);
        disableAutoScrollRef.current = false;
      }, 30000);
    }

    if (sessionStorage.getItem(STORAGE_KEYS.PENDING_SCROLL_TO_TOP) === "true") {
      setShouldScrollToTop(true);
      sessionStorage.removeItem(STORAGE_KEYS.PENDING_SCROLL_TO_TOP);
    }

    if (sessionStorage.getItem(STORAGE_KEYS.PENDING_SCROLL_TO_TOP_VIGNETTE) === "true") {
      messagesContainerRef.current?.scrollTo({
        top: 0,
        behavior: "smooth",
      });
      sessionStorage.removeItem(STORAGE_KEYS.PENDING_SCROLL_TO_TOP_VIGNETTE);
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
      sessionStorage.getItem(STORAGE_KEYS.DISABLE_AUTO_SCROLL) === "true";

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
    streamingWhiskySearchData,
    streamingCardsSearchData,
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

  const handleSend = async ({
    message: messageToSend,
    flashCards,
    flashCardType,
    scrollToTop = true,
    uuidProduct,
    productCategory,
  }: HandleSendOptions = {}) => {
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
      sessionStorage.setItem(STORAGE_KEYS.PENDING_SCROLL_TO_TOP, "true");
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
        STORAGE_KEYS.PENDING_MESSAGE,
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
        STORAGE_KEYS.PENDING_VIGNETTE_CONTENT,
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
    streamingWhiskySearchData,
    streamingWineSearchData,
    streamingCardsSearchData,
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
      setStreamingVignetteCategory(null);
      setShowStreamingIndicator(false);
      resetStreamingState();
    }, [resetStreamingState]),
  };
}
