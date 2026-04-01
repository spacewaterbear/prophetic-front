export const STORAGE_KEYS = {
  // Chat conversation pending state
  PENDING_MESSAGE: "pendingChatMessage",
  PENDING_VIGNETTE_CONTENT: "pendingVignetteContent",
  PENDING_MARKDOWN_STREAM: "pendingMarkdownStream",
  PENDING_SCROLL_TO_TOP: "pendingScrollToTop",
  PENDING_VIGNETTE_STREAM: "pendingVignetteStream",

  // Scroll / UI state
  DISABLE_AUTO_SCROLL: "disableAutoScroll",
  PENDING_SCROLL_TO_TOP_VIGNETTE: "pendingScrollToTopVignette",

  // Deep-search / product search
  PENDING_DEEP_SEARCH: "pendingDeepSearch",
  PENDING_PRODUCT_SEARCH: "pendingProductSearch",

  // Vignette detail view
  PENDING_VIGNETTE_VIEW: "pendingVignetteView",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
