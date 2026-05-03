import { useState, useRef, useEffect, useCallback, useReducer } from "react";
import { useSidebar } from "@/contexts/sidebar-context";
import { useRouter } from "next/navigation";
import {
  Message,
  PendingMessage,
  PendingVignetteStream,
  PendingMarkdownStream,
  MarketplaceData,
  type ImmoVariant,
} from "@/types/chat";
import { VignetteData } from "@/types/vignettes";
import { ClothesSearchData } from "@/components/ClothesSearchCard";
import { JewelrySearchData } from "@/components/JewelryCard";
import { CarsSearchData } from "@/components/CarsCard";
import { WatchesSearchData } from "@/components/WatchesCard";
import { WhiskySearchData } from "@/components/WhiskyCard";
import { WineSearchData } from "@/components/WineCard";
import { CardsSearchData } from "@/components/SportsCardsCard";
import { ImmoDisplayData } from "@/components/ImmoEstimationCard";
import { useChatPendingStore } from "@/store/chatPendingStore";
import { api, type ConversationDetailResponse, type CreateConversationResponse } from "@/lib/api";

export type { Message };


export interface HandleSendOptions {
  message?: string;
  flashCards?: string;
  flashCardType?: "flash_invest" | "ranking" | "portfolio" | "PORTFOLIO";
  scrollToTop?: boolean;
  uuidProduct?: string;
  productCategory?: string;
  immoVariant?: ImmoVariant | null;
}

interface UseChatConversationProps {
  conversationId: number | null;
  selectedModel?: string;
  selectedAgent?: string;
  isGuest?: boolean;
}

// ---------------------------------------------------------------------------
// Streaming state — consolidated into a single useReducer to allow atomic
// resets and eliminate the race conditions caused by batching 12+ setState
// calls in sequence.
// ---------------------------------------------------------------------------

interface StreamingState {
  message: string;
  wordsToHighlight: string[] | null;
  marketplaceData: MarketplaceData | null;
  realEstateData: import("@/types/chat").RealEstateData | null;
  vignetteData: VignetteData[] | null;
  clothesSearchData: ClothesSearchData | null;
  jewelrySearchData: JewelrySearchData | null;
  carsSearchData: CarsSearchData | null;
  watchesSearchData: WatchesSearchData | null;
  whiskySearchData: WhiskySearchData | null;
  wineSearchData: WineSearchData | null;
  cardsSearchData: CardsSearchData | null;
  immoDisplayData: ImmoDisplayData | null;
  vignetteCategory: string | null;
  status: string;
  lastActivity: number;
  showIndicator: boolean;
}

type StreamingAction =
  | { type: "RESET" }
  | { type: "APPEND_CHUNK"; content: string }
  | { type: "SET_MESSAGE"; message: string; wordsToHighlight?: string[] }
  | { type: "SET_MARKETPLACE"; data: MarketplaceData }
  | { type: "SET_REAL_ESTATE"; data: import("@/types/chat").RealEstateData }
  | { type: "SET_VIGNETTE_DATA"; data: VignetteData[] }
  | { type: "SET_CLOTHES"; data: ClothesSearchData }
  | { type: "SET_JEWELRY"; data: JewelrySearchData }
  | { type: "SET_CARS"; data: CarsSearchData }
  | { type: "SET_WATCHES"; data: WatchesSearchData }
  | { type: "SET_WHISKY"; data: WhiskySearchData }
  | { type: "SET_WINE"; data: WineSearchData }
  | { type: "SET_CARDS"; data: CardsSearchData }
  | { type: "SET_IMMO_DISPLAY"; data: ImmoDisplayData }
  | { type: "SET_VIGNETTE_CATEGORY"; category: string | null }
  | { type: "SET_STATUS"; status: string }
  | { type: "MARK_ACTIVITY" }
  | { type: "SET_INDICATOR"; show: boolean };

const initialStreaming: StreamingState = {
  message: "",
  wordsToHighlight: null,
  marketplaceData: null,
  realEstateData: null,
  vignetteData: null,
  clothesSearchData: null,
  jewelrySearchData: null,
  carsSearchData: null,
  watchesSearchData: null,
  whiskySearchData: null,
  wineSearchData: null,
  cardsSearchData: null,
  immoDisplayData: null,
  vignetteCategory: null,
  status: "",
  lastActivity: 0,
  showIndicator: false,
};

function streamingReducer(
  state: StreamingState,
  action: StreamingAction,
): StreamingState {
  switch (action.type) {
    case "RESET":
      return { ...initialStreaming, vignetteCategory: state.vignetteCategory };
    case "APPEND_CHUNK":
      return {
        ...state,
        message: state.message + action.content,
        lastActivity: Date.now(),
        status: "",
      };
    case "SET_MESSAGE":
      return { ...state, message: action.message, wordsToHighlight: action.wordsToHighlight ?? state.wordsToHighlight };
    case "SET_MARKETPLACE":
      return { ...state, marketplaceData: action.data };
    case "SET_REAL_ESTATE":
      return { ...state, realEstateData: action.data };
    case "SET_VIGNETTE_DATA":
      return { ...state, vignetteData: action.data };
    case "SET_CLOTHES":
      return { ...state, clothesSearchData: action.data };
    case "SET_JEWELRY":
      return { ...state, jewelrySearchData: action.data };
    case "SET_CARS":
      return { ...state, carsSearchData: action.data };
    case "SET_WATCHES":
      return { ...state, watchesSearchData: action.data };
    case "SET_WHISKY":
      return { ...state, whiskySearchData: action.data };
    case "SET_WINE":
      return { ...state, wineSearchData: action.data };
    case "SET_CARDS":
      return { ...state, cardsSearchData: action.data };
    case "SET_IMMO_DISPLAY":
      return { ...state, immoDisplayData: action.data };
    case "SET_VIGNETTE_CATEGORY":
      return { ...state, vignetteCategory: action.category };
    case "SET_STATUS":
      return { ...state, status: action.status, lastActivity: Date.now() };
    case "MARK_ACTIVITY":
      return { ...state, lastActivity: Date.now() };
    case "SET_INDICATOR":
      return { ...state, showIndicator: action.show };
    default:
      return state;
  }
}

export function useChatConversation({
  conversationId,
  selectedModel = "anthropic/claude-3.7-sonnet",
  selectedAgent = "discover",
  isGuest = false,
}: UseChatConversationProps) {
  const router = useRouter();
  const { bumpConversations } = useSidebar();
  const pendingStore = useChatPendingStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastUserMessageId, setLastUserMessageId] = useState<number | null>(null);
  const [shouldScrollToTop, setShouldScrollToTop] = useState(false);
  const [guestQuotaExhausted, setGuestQuotaExhausted] = useState(false);

  const [streaming, dispatch] = useReducer(streamingReducer, initialStreaming);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const disableAutoScrollRef = useRef(
    typeof window !== "undefined" && useChatPendingStore.getState().disableAutoScroll,
  );
  const pendingMessageProcessedRef = useRef(false);
  const lastProcessedConversationIdRef = useRef<number | null>(null);
  const scrollToTopIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshConversations = bumpConversations;

  const resetStreamingState = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  const loadConversation = useCallback(
    async (id: number) => {
      try {
        const data = await api.get<ConversationDetailResponse>(`/api/conversations/${id}`);
        setMessages(data.messages || []);
      } catch (error) {
        const status = (error as { status?: number }).status;
        if (status === 404) {
          console.error("Conversation not found, redirecting to home");
        } else {
          console.error("Error loading conversation:", error);
        }
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
          const data = await api.post<CreateConversationResponse>("/api/conversations", { title, model: selectedModel });
          const newId = data.conversation.id;

          const pendingStream: PendingMarkdownStream = { type, params, options };
          pendingStore.setPendingMarkdownStream(pendingStream);

          refreshConversations();
          router.push(`/chat/${newId}`);
          return true;
        } catch (error) {
          console.error("[streamMarkdown] Error creating conversation:", error);
        }
        return false;
      }

      setIsLoading(true);
      dispatch({ type: "SET_MESSAGE", message: "" });
      dispatch({
        type: "SET_VIGNETTE_CATEGORY",
        category: params.category || params.sub_category || null,
      });

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
          pendingStore.setDisableAutoScroll(true);
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
          let wordsToHighlight: string[] | null = null;
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
          let streamingImmoData: ImmoDisplayData | null = null;

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
                  wordsToHighlight = parsed.words_to_highlight || null;
                  dispatch({ type: "SET_MESSAGE", message: documentContent, wordsToHighlight: wordsToHighlight ?? undefined });
                } else if (parsed.type === "markdown") {
                  documentContent = parsed.text || "";
                  wordsToHighlight = parsed.words_to_highlight || null;
                  dispatch({ type: "SET_MESSAGE", message: documentContent, wordsToHighlight: wordsToHighlight ?? undefined });
                } else if (parsed.type === "jewelry_data") {
                  if ((parsed.data as JewelrySearchData)?.listings) {
                    streamingJewelryData = parsed.data as JewelrySearchData;
                    dispatch({ type: "SET_JEWELRY", data: streamingJewelryData });
                  }
                } else if (parsed.type === "clothes_data") {
                  if ((parsed.data as ClothesSearchData)?.listings) {
                    streamingClothesData = parsed.data as ClothesSearchData;
                    dispatch({ type: "SET_CLOTHES", data: streamingClothesData });
                  }
                } else if (parsed.type === "cars_data") {
                  if ((parsed.data as CarsSearchData)?.listings) {
                    streamingCarsData = parsed.data as CarsSearchData;
                    dispatch({ type: "SET_CARS", data: streamingCarsData });
                  }
                } else if (parsed.type === "watches_data") {
                  if ((parsed.data as WatchesSearchData)?.listings) {
                    streamingWatchesData = parsed.data as WatchesSearchData;
                    dispatch({ type: "SET_WATCHES", data: streamingWatchesData });
                  }
                } else if (parsed.type === "whisky_data") {
                  if ((parsed.data as WhiskySearchData)?.listings) {
                    streamingWhiskyData = parsed.data as WhiskySearchData;
                    dispatch({ type: "SET_WHISKY", data: streamingWhiskyData });
                  }
                } else if (parsed.type === "wine_data") {
                  if ((parsed.data as WineSearchData)?.listings) {
                    streamingWineData = parsed.data as WineSearchData;
                    dispatch({ type: "SET_WINE", data: streamingWineData });
                  }
                } else if (parsed.type === "cards_data") {
                  if ((parsed.data as CardsSearchData)?.listings) {
                    streamingCardsData = parsed.data as CardsSearchData;
                    dispatch({ type: "SET_CARDS", data: streamingCardsData });
                  }
                } else if (parsed.type === "marketplace_data") {
                  streamingMktData = parsed.data as MarketplaceData;
                  dispatch({ type: "SET_MARKETPLACE", data: streamingMktData });
                } else if (parsed.type === "real_estate_data") {
                  streamingREData = parsed.data as import("@/types/chat").RealEstateData;
                  dispatch({ type: "SET_REAL_ESTATE", data: streamingREData });
                } else if (parsed.type === "immo_display_data") {
                  streamingImmoData = parsed.data as ImmoDisplayData;
                  dispatch({ type: "SET_IMMO_DISPLAY", data: streamingImmoData });
                } else if (parsed.type === "questions_chunk") {
                  questionsContent += parsed.content || "";
                  dispatch({
                    type: "SET_MESSAGE",
                    message: documentContent + "\n\n" + questionsContent,
                  });
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
                    ...(streamingImmoData ? { immo_display_data: streamingImmoData } : {}),
                    ...(wordsToHighlight ? { words_to_highlight: wordsToHighlight } : {}),
                  };

                  const saveToDb = async (convId: number) => {
                    try {
                      await fetch(`/api/conversations/${convId}/vignette-content`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          messages: [
                            {
                              content: finalContent,
                              vignetteCategory: params.category || params.sub_category,
                            },
                          ],
                        }),
                      });
                    } catch (e) {
                      console.error("[Markdown SSE] Error saving to database:", e);
                    }
                  };

                  setMessages((prev) => [...prev, aiMessage]);
                  if (conversationId) saveToDb(conversationId);
                  dispatch({ type: "RESET" });
                }
              } catch (e) {
                console.error("[Markdown Stream] Parse error:", e);
              }
            }
          }
        } else {
          const jsonResponse = await response.json();
          const textContent = jsonResponse.text || jsonResponse.content || "";
          const qContent = jsonResponse.questions || "";
          const content = qContent
            ? `${textContent}\n\n${qContent}`
            : textContent;

          if (content) {
            const aiMessage: Message = {
              id: Date.now(),
              content,
              sender: "ai",
              created_at: new Date().toISOString(),
              vignetteCategory: params.category || params.sub_category,
            };

            setMessages((prev) => [...prev, aiMessage]);
            if (conversationId) {
              await fetch(
                `/api/conversations/${conversationId}/vignette-content`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    messages: [
                      {
                        content,
                        vignetteCategory: params.category || params.sub_category,
                      },
                    ],
                  }),
                },
              );
            }
          }
        }

        setIsLoading(false);
        return true;
      } catch (error) {
        console.error("[streamMarkdown] Error:", error);
        setIsLoading(false);
        dispatch({ type: "SET_MESSAGE", message: "" });
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
      immoVariant?: ImmoVariant | null,
    ) => {
      setIsLoading(true);
      dispatch({ type: "RESET" });
      dispatch({ type: "MARK_ACTIVITY" });
      dispatch({ type: "SET_INDICATOR", show: false });

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
        pendingStore.setDisableAutoScroll(true);
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
              ...(immoVariant ? { immo_variant: immoVariant } : {}),
            }),
          },
        );

        if (response.status === 402) {
          const data = await response.json().catch(() => ({}));
          if ((data as { code?: string }).code === "guest_quota_exceeded") {
            setGuestQuotaExhausted(true);
            router.push("/pricing");
          }
          return;
        }
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
            dispatch({ type: "APPEND_CHUNK", content: data.content as string });
          },
          marketplace_data: (data) => {
            let payload = data.data;
            if (typeof payload === "string") {
              try { payload = JSON.parse(payload as string); } catch { /* keep as-is */ }
            }
            setShouldScrollToTop(false);
            dispatch({ type: "SET_MARKETPLACE", data: payload as MarketplaceData });
          },
          real_estate_data: (data) => {
            setShouldScrollToTop(false);
            dispatch({ type: "SET_REAL_ESTATE", data: data.data as import("@/types/chat").RealEstateData });
          },
          vignette_data: (data) => {
            dispatch({ type: "SET_VIGNETTE_DATA", data: data.data as VignetteData[] });
          },
          clothes_data: (data) => {
            if ((data.data as ClothesSearchData)?.listings) {
              setShouldScrollToTop(false);
              dispatch({ type: "SET_CLOTHES", data: data.data as ClothesSearchData });
            }
          },
          jewelry_data: (data) => {
            if ((data.data as JewelrySearchData)?.listings) {
              setShouldScrollToTop(false);
              dispatch({ type: "SET_JEWELRY", data: data.data as JewelrySearchData });
            }
          },
          cars_data: (data) => {
            if ((data.data as CarsSearchData)?.listings) {
              setShouldScrollToTop(false);
              dispatch({ type: "SET_CARS", data: data.data as CarsSearchData });
            }
          },
          watches_data: (data) => {
            if ((data.data as WatchesSearchData)?.listings) {
              setShouldScrollToTop(false);
              dispatch({ type: "SET_WATCHES", data: data.data as WatchesSearchData });
            }
          },
          whisky_data: (data) => {
            if ((data.data as WhiskySearchData)?.listings) {
              setShouldScrollToTop(false);
              dispatch({ type: "SET_WHISKY", data: data.data as WhiskySearchData });
            }
          },
          wine_data: (data) => {
            if ((data.data as WineSearchData)?.listings) {
              setShouldScrollToTop(false);
              dispatch({ type: "SET_WINE", data: data.data as WineSearchData });
            }
          },
          cards_data: (data) => {
            if ((data.data as CardsSearchData)?.listings) {
              setShouldScrollToTop(false);
              dispatch({ type: "SET_CARDS", data: data.data as CardsSearchData });
            }
          },
          immo_display_data: (data) => {
            setShouldScrollToTop(false);
            dispatch({ type: "SET_IMMO_DISPLAY", data: data.data as ImmoDisplayData });
          },
          done: async () => {
            await loadConversation(targetConversationId);
            dispatch({ type: "RESET" });
            if (isGuest) {
              setGuestQuotaExhausted(true);
            }
          },
          artist_info: async (data) => {
            if (data.userMessage || data.aiMessage) {
              await loadConversation(targetConversationId);
              dispatch({ type: "RESET" });
            }
          },
          status: (data) => {
            dispatch({ type: "SET_STATUS", status: data.message as string ?? "" });
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

        // suppress unused variable warning – kept for future use
        void streamContent;
      } catch (error) {
        console.error("Error sending message:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [loadConversation, selectedAgent, isGuest, router],
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
      const pendingVignetteStream = pendingStore.pendingVignetteStream;
      if (pendingVignetteStream) {
        pendingMessageProcessedRef.current = true;
        pendingStore.setPendingVignetteStream(null);
        try {
          streamVignetteMarkdown(
            pendingVignetteStream.imageName,
            pendingVignetteStream.category,
            pendingVignetteStream.tier,
          );
        } catch (e) {
          console.error(e);
          loadConversation(conversationId);
        }
        return;
      }

      // Priority 2: Pending Markdown Stream
      const pendingMarkdownStream = pendingStore.pendingMarkdownStream;
      if (pendingMarkdownStream) {
        pendingMessageProcessedRef.current = true;
        pendingStore.setPendingMarkdownStream(null);
        try {
          streamMarkdown(
            pendingMarkdownStream.type,
            pendingMarkdownStream.params,
            pendingMarkdownStream.options,
          );
        } catch (e) {
          console.error(e);
          loadConversation(conversationId);
        }
        return;
      }

      // Priority 3: Pending User Message
      const pendingMessage = pendingStore.pendingMessage;
      if (pendingMessage) {
        pendingMessageProcessedRef.current = true;
        pendingStore.setPendingMessage(null);

        // Pre-load any vignette content that was displayed before the chat
        const pendingVignetteContentData = pendingStore.pendingVignetteContent;
        if (pendingVignetteContentData) {
          pendingStore.setPendingVignetteContent(null);
          const text = pendingVignetteContentData.text;
          if (text) {
            setMessages([
              {
                id: -Date.now(),
                content: text,
                sender: "ai" as const,
                created_at: new Date().toISOString(),
                vignetteCategory: pendingVignetteContentData.vignetteCategory,
              },
            ]);
          }
        }

        sendMessageToApi(
          conversationId,
          pendingMessage.content,
          pendingMessage.flashCards,
          pendingMessage.flashCardType,
          pendingMessage.scrollToTop,
          pendingMessage.uuidProduct,
          pendingMessage.productCategory,
          pendingMessage.agentType,
          pendingMessage.immoVariant,
        );
        return;
      }

      // Priority 4: Pending Vignette Content (standalone, no user message)
      const pendingVignetteContent = pendingStore.pendingVignetteContent;
      if (pendingVignetteContent) {
        pendingMessageProcessedRef.current = true;
        pendingStore.setPendingVignetteContent(null);

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

        if (pendingVignetteContent.text) {
          const messagesToSave = [
            {
              content: pendingVignetteContent.text,
              vignetteCategory: pendingVignetteContent.vignetteCategory,
            },
          ];
          if (pendingVignetteContent.questions)
            messagesToSave.push({
              content: pendingVignetteContent.questions,
              vignetteCategory: pendingVignetteContent.vignetteCategory,
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
        }
        return;
      }

      loadConversation(conversationId);
    } else {
      setMessages([]);
      pendingMessageProcessedRef.current = false;
      lastProcessedConversationIdRef.current = null;
    }

    if (pendingStore.disableAutoScroll) {
      disableAutoScrollRef.current = true;
      setTimeout(() => {
        pendingStore.setDisableAutoScroll(false);
        disableAutoScrollRef.current = false;
      }, 30000);
    }

    if (pendingStore.pendingScrollToTop) {
      setShouldScrollToTop(true);
      pendingStore.setPendingScrollToTop(false);
    }

    if (pendingStore.pendingScrollToTopVignette) {
      messagesContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      pendingStore.setPendingScrollToTopVignette(false);
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
      disableAutoScrollRef.current || pendingStore.disableAutoScroll;

    if (shouldScrollToTop && lastUserMessageId && messagesContainerRef.current) {
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
            pendingStore.setDisableAutoScroll(false);
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
          pendingStore.setDisableAutoScroll(false);
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
    streaming.message,
    streaming.marketplaceData,
    streaming.realEstateData,
    streaming.vignetteData,
    streaming.clothesSearchData,
    streaming.jewelrySearchData,
    streaming.carsSearchData,
    streaming.watchesSearchData,
    streaming.whiskySearchData,
    streaming.cardsSearchData,
    isLoading,
    shouldAutoScroll,
    shouldScrollToTop,
    lastUserMessageId,
  ]);

  // Streaming indicator logic
  useEffect(() => {
    if (!isLoading) {
      dispatch({ type: "SET_INDICATOR", show: false });
      return;
    }
    const interval = setInterval(() => {
      const timeSinceLastActivity = Date.now() - streaming.lastActivity;
      dispatch({
        type: "SET_INDICATOR",
        show: Boolean(isLoading && streaming.message && timeSinceLastActivity > 500),
      });
    }, 300);
    return () => clearInterval(interval);
  }, [isLoading, streaming.message, streaming.lastActivity]);

  const handleSend = useCallback(async ({
    message: messageToSend,
    flashCards,
    flashCardType,
    scrollToTop = true,
    uuidProduct,
    productCategory,
    immoVariant,
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
        immoVariant,
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
      pendingStore.setPendingScrollToTop(true);
    }

    try {
      const title =
        userInput.length > 50 ? userInput.substring(0, 50) + "..." : userInput;
      const data = await api.post<CreateConversationResponse>("/api/conversations", { title, model: selectedModel });
      const newConversationId = data.conversation.id;

      pendingStore.setPendingMessage({
        content: userInput,
        flashCards,
        flashCardType,
        scrollToTop,
        uuidProduct,
        productCategory,
        agentType: selectedAgent,
        immoVariant,
      });
      refreshConversations();
      router.push(`/chat/${newConversationId}`);
    } catch (error) {
      console.error("Error creating conversation:", error);
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, input, isLoading, sendMessageToApi, selectedAgent, selectedModel, refreshConversations, router, pendingStore]);

  const handleFlashcardClick = useCallback((
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

    // suppress unused param warning — kept for API compatibility
    void question;
  }, [streamMarkdown]);

  const addAiMessage = useCallback(async (content: string) => {
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
      const data = await api.post<CreateConversationResponse>("/api/conversations", { title, model: selectedModel });
      pendingStore.setPendingVignetteContent({ text: content });
      refreshConversations();
      router.push(`/chat/${data.conversation.id}`);
    } catch (error) {
      console.error("Error:", error);
    }
  }, [conversationId, selectedModel, pendingStore, refreshConversations, router]);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (container)
      setShouldAutoScroll(
        container.scrollHeight - container.scrollTop - container.clientHeight < 20,
      );
  }, []);

  return {
    messages,
    input,
    setInput,
    isLoading,
    streamingMessage: streaming.message,
    streamingWordsToHighlight: streaming.wordsToHighlight,
    streamingMarketplaceData: streaming.marketplaceData,
    streamingRealEstateData: streaming.realEstateData,
    streamingVignetteData: streaming.vignetteData,
    streamingClothesSearchData: streaming.clothesSearchData,
    streamingJewelrySearchData: streaming.jewelrySearchData,
    streamingCarsSearchData: streaming.carsSearchData,
    streamingWatchesSearchData: streaming.watchesSearchData,
    streamingWhiskySearchData: streaming.whiskySearchData,
    streamingWineSearchData: streaming.wineSearchData,
    streamingCardsSearchData: streaming.cardsSearchData,
    streamingImmoDisplayData: streaming.immoDisplayData,
    streamingVignetteCategory: streaming.vignetteCategory,
    currentStatus: streaming.status,
    streamingLastActivity: streaming.lastActivity,
    showStreamingIndicator: streaming.showIndicator,
    messagesEndRef,
    messagesContainerRef,
    disableAutoScrollRef,
    lastUserMessageId,
    shouldScrollToTop,
    setShouldScrollToTop,
    handleSend,
    handleFlashcardClick,
    handleScroll,
    guestQuotaExhausted,
    addAiMessage,
    streamVignetteMarkdown,
    streamMarkdown,
    clearMessages: useCallback(() => {
      setMessages([]);
      dispatch({ type: "SET_VIGNETTE_CATEGORY", category: null });
      dispatch({ type: "SET_INDICATOR", show: false });
      resetStreamingState();
    }, [resetStreamingState]),
  };
}
