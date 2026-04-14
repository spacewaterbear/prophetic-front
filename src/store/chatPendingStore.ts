/**
 * Zustand store for pending cross-navigation chat state.
 *
 * Replaces the scattered sessionStorage.setItem/getItem pattern that previously
 * spread across useChatConversation, page.tsx, VignetteDetailView, artists/page,
 * products/page, and [vignetteSlug]/page. A single inspectable store eliminates
 * the race conditions that arise when multiple components read/write the same
 * sessionStorage keys in the same render cycle.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { PendingMessage, PendingVignetteStream, PendingMarkdownStream } from "@/types/chat";

interface VignetteViewParams {
  imageName: string;
  category: string;
  slug?: string;
}

interface ProductSearchParams {
  id: string;
  name: string;
  category: string;
}

interface PendingVignetteContent {
  text: string;
  vignetteCategory?: string;
  questions?: string;
}

interface ChatPendingState {
  pendingMessage: PendingMessage | null;
  pendingVignetteContent: PendingVignetteContent | null;
  pendingMarkdownStream: PendingMarkdownStream | null;
  pendingVignetteStream: PendingVignetteStream | null;
  pendingVignetteView: VignetteViewParams | null;
  pendingDeepSearch: string | null;
  pendingProductSearch: ProductSearchParams | null;
  pendingScrollToTop: boolean;
  pendingScrollToTopVignette: boolean;
  disableAutoScroll: boolean;

  setPendingMessage: (msg: PendingMessage | null) => void;
  setPendingVignetteContent: (content: PendingVignetteContent | null) => void;
  setPendingMarkdownStream: (stream: PendingMarkdownStream | null) => void;
  setPendingVignetteStream: (stream: PendingVignetteStream | null) => void;
  setPendingVignetteView: (params: VignetteViewParams | null) => void;
  setPendingDeepSearch: (name: string | null) => void;
  setPendingProductSearch: (params: ProductSearchParams | null) => void;
  setPendingScrollToTop: (val: boolean) => void;
  setPendingScrollToTopVignette: (val: boolean) => void;
  setDisableAutoScroll: (val: boolean) => void;
}

export const useChatPendingStore = create<ChatPendingState>()(
  persist(
    (set) => ({
      pendingMessage: null,
      pendingVignetteContent: null,
      pendingMarkdownStream: null,
      pendingVignetteStream: null,
      pendingVignetteView: null,
      pendingDeepSearch: null,
      pendingProductSearch: null,
      pendingScrollToTop: false,
      pendingScrollToTopVignette: false,
      disableAutoScroll: false,

      setPendingMessage: (msg) => set({ pendingMessage: msg }),
      setPendingVignetteContent: (content) => set({ pendingVignetteContent: content }),
      setPendingMarkdownStream: (stream) => set({ pendingMarkdownStream: stream }),
      setPendingVignetteStream: (stream) => set({ pendingVignetteStream: stream }),
      setPendingVignetteView: (params) => set({ pendingVignetteView: params }),
      setPendingDeepSearch: (name) => set({ pendingDeepSearch: name }),
      setPendingProductSearch: (params) => set({ pendingProductSearch: params }),
      setPendingScrollToTop: (val) => set({ pendingScrollToTop: val }),
      setPendingScrollToTopVignette: (val) => set({ pendingScrollToTopVignette: val }),
      setDisableAutoScroll: (val) => set({ disableAutoScroll: val }),
    }),
    {
      name: "chat-pending",
      storage: createJSONStorage(() => sessionStorage),
      // Only persist the data fields, not the setters
      partialize: (state) => ({
        pendingMessage: state.pendingMessage,
        pendingVignetteContent: state.pendingVignetteContent,
        pendingMarkdownStream: state.pendingMarkdownStream,
        pendingVignetteStream: state.pendingVignetteStream,
        pendingVignetteView: state.pendingVignetteView,
        pendingDeepSearch: state.pendingDeepSearch,
        pendingProductSearch: state.pendingProductSearch,
        pendingScrollToTop: state.pendingScrollToTop,
        pendingScrollToTopVignette: state.pendingScrollToTopVignette,
        disableAutoScroll: state.disableAutoScroll,
      }),
    },
  ),
);
