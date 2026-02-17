# 03 - Components Reference

Comprehensive documentation for every component in `src/components/`. Organized by directory, with full props interfaces, state variables, rendering logic, and dependency maps.

> **Cross-references:** Architecture overview in [01-ARCHITECTURE.md](./01-ARCHITECTURE.md), API routes in [02-API_ROUTES.md](./02-API_ROUTES.md), streaming internals in [STREAMING_FLOW.md](./STREAMING_FLOW.md).

---

## Table of Contents

1. [chat/ Components](#1-chat-components)
   - [MessageItem](#11-messageitem)
   - [ConversationView](#12-conversationview)
   - [WelcomeScreen](#13-welcomescreen)
   - [ChatHeader](#14-chatheader)
   - [StreamingBubble](#15-streamingbubble)
   - [AIAvatar](#16-aiavatar)
2. [chat-input/ Components](#2-chat-input-components)
   - [ChatInput](#21-chatinput)
   - [ModeSelector](#22-modeselector)
   - [FlashcardMenu](#23-flashcardmenu)
   - [PortfolioMenu](#24-portfoliomenu)
   - [SettingsMenu](#25-settingsmenu)
   - [CategoryButton & ModeCard](#26-categorybutton--modecard)
   - [MobileBottomSheets](#27-mobilebottomsheets)
   - [index.ts (Barrel Export)](#28-indexts-barrel-export)
3. [ui/ Components (shadcn/ui)](#3-ui-components-shadcnui)
   - [Button](#31-button)
   - [Card](#32-card)
   - [Input](#33-input)
   - [DropdownMenu](#34-dropdownmenu)
   - [Chart](#35-chart)
4. [share/ Components](#4-share-components)
   - [CopyButton](#41-copybutton)
   - [SharedMessageList](#42-sharedmessagelist)
5. [Top-Level Components](#5-top-level-components)
   - [Markdown](#51-markdown)
   - [ArtistCard](#52-artistcard)
   - [ArtistDashboard](#53-artistdashboard)
   - [MarketplaceCard](#54-marketplacecard)
   - [RealEstateCard](#55-realestatecard)
   - [VignetteGridCard](#56-vignettegridcard)
   - [ClothesSearchCard](#57-clothessearchcard)
   - [FileUploadPreview](#58-fileuploadpreview)
   - [FileAttachment](#59-fileattachment)
   - [SelectionContextMenu](#510-selectioncontextmenu)
   - [ModelSelector](#511-modelselector)
   - [ThemeToggle](#512-themetoggle)
   - [ShareButton](#513-sharebutton)
   - [TypingIndicator](#514-typingindicator)
   - [LinkPreview](#515-linkpreview)
   - [MetricBadge](#516-metricbadge)
   - [SellStatusBar](#517-sellstatusbar)
   - [SocialScoreBar](#518-socialscorebar)
   - [GoogleDrivePicker](#519-googledrivepicker)

---

## 1. chat/ Components

### 1.1 MessageItem

**File:** `src/components/chat/MessageItem.tsx` (450 lines)

**Purpose:** Renders a single chat message (user or AI) with copy-to-clipboard, PDF export, and lazy-loaded rich content cards (artist, marketplace, real estate, vignettes, clothes). This is the core message rendering unit used by both `ConversationView` and `WelcomeScreen`.

**Props Interface:**

```typescript
interface MessageItemProps {
  message: Message;
  userName: string;
  onVignetteClick?: (vignette: VignetteData) => void;
  handleBackToCategory?: (category: string) => void;
}
```

**Key State Variables:**

```typescript
const [copied, setCopied] = useState(false);       // Copy confirmation feedback
const [pdfLoading, setPdfLoading] = useState(false); // PDF generation in progress
```

**Lazy-Loaded Dependencies:**

All heavy card components are loaded via `React.lazy()` to reduce initial bundle size:

```typescript
const Markdown = lazy(() =>
  import("@/components/Markdown").then((mod) => ({ default: mod.Markdown })),
);
const ArtistCard = lazy(() => import("@/components/ArtistCard").then(...));
const MarketplaceCard = lazy(() => import("@/components/MarketplaceCard").then(...));
const RealEstateCard = lazy(() => import("@/components/RealEstateCard").then(...));
const VignetteGridCard = lazy(() => import("@/components/VignetteGridCard").then(...));
const ClothesSearchCard = lazy(() => import("@/components/ClothesSearchCard").then(...));
```

**Notable Rendering Logic:**

The component dispatches rendering based on `message.sender` and `message.type`:

```typescript
{message.sender === "user" ? (
  <Markdown content={message.content} className="text-base" />
) : message.type === "artist_info" && message.artist ? (
  <ArtistCard artist={message.artist} ... />
) : (
  <>
    {message.content && <Markdown content={message.content} ... />}
    {message.marketplace_data && <MarketplaceCard data={message.marketplace_data} />}
    {message.real_estate_data && <RealEstateCard data={message.real_estate_data} />}
    {message.vignette_data && <VignetteGridCard data={message.vignette_data} ... />}
    {message.clothes_search_data && <ClothesSearchCard data={message.clothes_search_data} />}
  </>
)}
```

Marketplace data supports positioning (`message.marketplace_position` = `"before"` or `"after"` relative to text content).

**PDF Export Logic:**

The `handleExportPdf` function dynamically imports `html2pdf.js` and `marked`, converts markdown to HTML, then injects inline styles for all custom CSS classes (ranking cards, allocation profiles, ASCII tables, etc.) since PDF renderers do not process external stylesheets. A large `classToStyle` map and `tagStyles` map provide complete inline styling:

```typescript
const classToStyle: Record<string, string> = {
  "ranking-list": "display:flex;flex-direction:column;gap:12px;margin:16px 0;",
  "ranking-card": "background:#fff;border:1px solid #e4e4e7;border-radius:14px;...",
  // ... 30+ class mappings
};
```

iOS devices receive special handling -- the PDF opens in a new tab via `URL.createObjectURL` instead of triggering a download.

**Dependencies:** `react` (lazy, memo, Suspense, useState), `lucide-react` (Check, Copy, FileDown), `sonner` (toast), `AIAvatar`, `Message` + `CATEGORY_DISPLAY_NAMES` from `@/types/chat`, `VignetteData` from `@/types/vignettes`, five markdown-utils converters, `@/components/ui/button`.

---

### 1.2 ConversationView

**File:** `src/components/chat/ConversationView.tsx` (143 lines)

**Purpose:** Composes the full conversation UI: a scrollable message list, typing indicator, streaming bubble, and the chat input area. Used when a conversation has been created and has an ID.

**Props Interface:**

```typescript
interface ConversationViewProps {
  messages: Message[];
  isLoading: boolean;
  streamingMessage: string;
  streamingMarketplaceData: MarketplaceData | null;
  streamingRealEstateData: RealEstateData | null;
  streamingVignetteData: VignetteData[] | null;
  streamingClothesSearchData: ClothesSearchData | null;
  streamingVignetteCategory: string | null;
  currentStatus: string;
  showStreamingIndicator: boolean;
  messagesEndRef: RefObject<HTMLDivElement>;
  messagesContainerRef: RefObject<HTMLDivElement>;
  handleScroll: () => void;
  handleVignetteClick: (vignette: VignetteData) => void;
  handleBackToCategory: (category: string) => void;
  handleFlashcardClick: (
    flashCards: string,
    question: string,
    flashCardType: "flash_invest" | "ranking" | "portfolio" | "PORTFOLIO",
    displayName: string,
    tier?: string,
  ) => void;
  input: string;
  setInput: (value: string) => void;
  handleSend: () => void;
  userName: string;
  userStatus?: UserStatus;
  selectedAgent: AgentType;
  onAgentChange: (agent: AgentType) => void;
}
```

**Key State Variables:** None -- this is a stateless composition component. All state is lifted to the parent chat page via props.

**Notable Rendering Logic:**

The typing indicator only shows when loading but no streaming content has arrived yet:

```typescript
{isLoading &&
  !streamingMessage &&
  !streamingMarketplaceData &&
  !streamingVignetteData &&
  !streamingClothesSearchData && (
    <div className="flex gap-2 sm:gap-4 items-start justify-start">
      <AIAvatar />
      <div className="...">
        <TypingIndicator />
        {currentStatus && <p className="...">{currentStatus}</p>}
      </div>
    </div>
  )}
```

The layout uses `chat-history` and `input-area` CSS classes with the scrollable message container receiving `messagesContainerRef` and `messagesEndRef` for auto-scroll behavior.

**Dependencies:** `ChatInput`, `MessageItem`, `AIAvatar`, `StreamingBubble`, `TypingIndicator`, types from `@/types/chat`, `@/types/vignettes`, `@/types/agents`, `ClothesSearchData` from `ClothesSearchCard`.

---

### 1.3 WelcomeScreen

**File:** `src/components/chat/WelcomeScreen.tsx` (201 lines)

**Purpose:** The initial view before any conversation is created. Shows either: (a) messages + streaming if content exists, (b) vignette grid if vignettes are loaded, (c) loading spinner, (d) error state, or (e) the welcome greeting with logo and chat input.

**Props Interface:**

```typescript
interface WelcomeScreenProps {
  messages: Message[];
  streamingMessage: string;
  streamingVignetteCategory: string | null;
  vignettes: VignetteData[];
  vignetteLoading: boolean;
  vignetteError: string | null;
  input: string;
  setInput: (value: string) => void;
  handleSend: () => void;
  isLoading: boolean;
  handleFlashcardClick: (...) => void;
  handleVignetteClick: (vignette: VignetteData) => void;
  handleBackToCategory: (category: string) => void;
  userName: string;
  profileUsername: string | null;
  userStatus?: UserStatus;
  selectedAgent: AgentType;
  onAgentChange: (agent: AgentType) => void;
  mounted: boolean;
  isDark: boolean;
}
```

**Key State Variables:**

```typescript
const welcomeContainerRef = useRef<HTMLDivElement>(null);
```

**Notable Rendering Logic:**

Five-state conditional rendering cascade:

```typescript
{messages.length > 0 || streamingMessage ? (
  // Show message list + streaming bubble
) : vignettes.length > 0 ? (
  // Show VignetteGridCard
) : vignetteLoading ? (
  // Show spinner
) : vignetteError ? (
  // Show error message
) : (
  // Show logo + greeting + ChatInput
)}
```

The greeting text uses i18n with name interpolation:

```typescript
<h1 className="text-3xl sm:text-4xl ...">
  {t("chat.greeting").replace("{name}", profileUsername || userName || "")}
</h1>
```

The logo switches between light/dark variants based on `mounted && isDark`:

```typescript
src={mounted && isDark
  ? "https://...flavicon_new_dark.svg"
  : "https://...flavicon_new.svg"
}
```

**Dependencies:** `react` (lazy, Suspense, useRef), `next/image`, `useI18n`, `ChatInput`, `MessageItem`, `AIAvatar`, `Markdown` (lazy), `VignetteGridCard` (lazy), types from `@/types/chat`, `@/types/vignettes`, `@/types/agents`.

---

### 1.4 ChatHeader

**File:** `src/components/chat/ChatHeader.tsx` (67 lines)

**Purpose:** Top navigation bar showing the Prophetic Orchestra logo, model selector (admin-only), theme toggle, and share button.

**Props Interface:**

```typescript
interface ChatHeaderProps {
  isWelcomeScreen: boolean;
  isAdmin: boolean;
  selectedModel: string;
  onModelChange: (model: string) => void;
  isLoading: boolean;
  conversationId: number | null;
  mounted: boolean;
  isDark: boolean;
}
```

**Key State Variables:** None -- pure presentational component.

**Notable Rendering Logic:**

The model selector and share button are hidden on the welcome screen:

```typescript
{!isWelcomeScreen && isAdmin && (
  <ModelSelector selectedModel={selectedModel} onModelChange={onModelChange} disabled={isLoading} />
)}
<ThemeToggle />
{!isWelcomeScreen && (
  <ShareButton conversationId={conversationId} disabled={isLoading} />
)}
```

The header uses backdrop blur and a left padding offset (`pl-14`) on mobile to accommodate the sidebar toggle button:

```typescript
<header className="relative z-10 bg-[rgba(249,248,244,0.8)] dark:bg-black backdrop-blur-md border-b border-gray-400 dark:border-gray-800 pl-14 pr-6 md:px-6 h-[52px] sm:h-[60px] ...">
```

**Dependencies:** `next/image`, `next/link`, `ThemeToggle`, `ShareButton`, `ModelSelector`.

---

### 1.5 StreamingBubble

**File:** `src/components/chat/StreamingBubble.tsx` (182 lines)

**Purpose:** Renders the AI response while it is being streamed. Combines the streaming text with any structured data (marketplace, real estate, vignettes, clothes) that arrives during the SSE stream. Returns `null` when there is no streaming content.

**Props Interface:**

```typescript
interface StreamingBubbleProps {
  streamingMessage: string;
  streamingMarketplaceData: MarketplaceData | null;
  streamingRealEstateData: RealEstateData | null;
  streamingVignetteData: VignetteData[] | null;
  streamingClothesSearchData: ClothesSearchData | null;
  streamingVignetteCategory: string | null;
  showStreamingIndicator: boolean;
  isLoading: boolean;
  handleVignetteClick: (vignette: VignetteData) => void;
  handleBackToCategory: (category: string) => void;
}
```

**Key State Variables:** None -- stateless component.

**Notable Rendering Logic:**

Early return when no content exists:

```typescript
const hasContent =
  streamingMessage || streamingMarketplaceData || streamingRealEstateData ||
  streamingVignetteData || streamingClothesSearchData;

if (!hasContent) return null;
```

All card components are lazy-loaded (same pattern as MessageItem). The streaming indicator (`TypingIndicator`) is appended at the bottom when `showStreamingIndicator` is true. A separate typing indicator shows when loading without any streaming message.

**Dependencies:** `react` (lazy, Suspense), `AIAvatar`, `TypingIndicator`, `CATEGORY_DISPLAY_NAMES`/`MarketplaceData`/`RealEstateData` from `@/types/chat`, `VignetteData` from `@/types/vignettes`, `ClothesSearchData` from `ClothesSearchCard`, lazy-loaded `Markdown`, `MarketplaceCard`, `RealEstateCard`, `VignetteGridCard`, `ClothesSearchCard`.

---

### 1.6 AIAvatar

**File:** `src/components/chat/AIAvatar.tsx` (35 lines)

**Purpose:** Displays the Prophetic Orchestra logo as the AI's avatar next to messages. Switches between light and dark mode logos. Hidden on mobile (`hidden sm:flex`).

**Props Interface:** None -- no props.

**Key State Variables:**

```typescript
const { theme, resolvedTheme } = useTheme();
const [mounted, setMounted] = useState(false);
const isDark = theme === "dark" || resolvedTheme === "dark";
```

**Notable Rendering Logic:**

```typescript
<div className="hidden sm:flex w-8 h-8 sm:w-10 sm:h-10 mt-1 rounded-full items-center justify-center flex-shrink-0 overflow-hidden">
  <Image
    src={mounted && isDark
      ? "https://...flavicon_new_dark.svg"
      : "https://...flavicon_new.svg"
    }
    alt="Prophetic Orchestra"
    width={40} height={40}
    className="w-full h-full object-cover"
    priority
  />
</div>
```

The `mounted` guard prevents hydration mismatches with theme detection. The component is memoized with `React.memo`.

**Dependencies:** `react` (memo, useEffect, useState), `next/image`, `next-themes` (useTheme).

---

## 2. chat-input/ Components

### 2.1 ChatInput

**File:** `src/components/chat-input/ChatInput.tsx` (497 lines)

**Purpose:** The main chat input component. Contains a textarea with auto-resize, a toolbar with file upload, mode selector, flashcard menu, ranking menu, portfolio menu, and settings menu. Manages desktop dropdown hover interactions and renders mobile bottom sheets via React portal.

**Props Interface:**

```typescript
interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  handleSend: () => void;
  isLoading: boolean;
  className?: string;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  userStatus?: UserStatus;
  selectedAgent?: AgentType;
  onAgentChange?: (agent: AgentType) => void;
  userId?: string;
  conversationId?: number | null;
  attachedFiles?: AttachedFile[];
  onFilesChange?: (files: AttachedFile[]) => void;
  onFlashcardClick?: (
    flashCards: string,
    question: string,
    flashCardType: "flash_invest" | "ranking" | "portfolio" | "PORTFOLIO",
    displayName: string,
    tier?: string,
  ) => void;
}
```

**Key State Variables:**

```typescript
const [mounted, setMounted] = useState(false);
const [textareaHeight, setTextareaHeight] = useState<number>(24);

// Dropdown open states
const [isDropdownOpen, setIsDropdownOpen] = useState(false);    // Mode selector
const [isFileUploadOpen, setIsFileUploadOpen] = useState(false);
const [isChronoOpen, setIsChronoOpen] = useState(false);        // Flashcard menu
const [isRankingOpen, setIsRankingOpen] = useState(false);
const [isSettingsOpen, setIsSettingsOpen] = useState(false);
const [isPortfolioOpen, setIsPortfolioOpen] = useState(false);
const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
const [mobileMenuLevel, setMobileMenuLevel] = useState<
  "main" | "flashcards" | "ranking" | "portfolio"
>("main");
```

**Notable Rendering Logic:**

**Auto-resize textarea:** The textarea height adjusts automatically up to 7 rows (168px max):

```typescript
useEffect(() => {
  const textarea = ref.current;
  if (!textarea) return;
  const LINE_HEIGHT = 24;
  const MAX_ROWS = 7;
  textarea.style.height = "auto";
  const scrollHeight = textarea.scrollHeight;
  const maxPixelHeight = LINE_HEIGHT * MAX_ROWS;
  const newHeight = Math.min(Math.max(scrollHeight, LINE_HEIGHT), maxPixelHeight);
  setTextareaHeight(newHeight);
  textarea.style.height = `${newHeight}px`;
}, [input, ref]);
```

**Desktop hover pattern:** A reusable `makeHoverHandlers` factory creates `onMouseEnter`/`onMouseLeave` handlers for each dropdown. It checks for hover capability (`window.matchMedia("(hover: hover)")`), closes all other dropdowns, and uses a 100ms delay timeout on leave to prevent flickering:

```typescript
const makeHoverHandlers = (openFn: () => void, closeFn: () => void) => ({
  onMouseEnter: () => {
    if (closeTimeoutRef.current) { clearTimeout(closeTimeoutRef.current); }
    if (window.matchMedia("(hover: hover)").matches) {
      closeAllDropdowns();
      openFn();
    }
  },
  onMouseLeave: () => {
    if (window.matchMedia("(hover: hover)").matches) {
      closeTimeoutRef.current = setTimeout(closeFn, 100);
    }
  },
});
```

**Mobile bottom sheets** are rendered via `createPortal` to `document.body` (only after `mounted`):

```typescript
{mounted && createPortal(
  <MobileBottomSheets
    isDropdownOpen={isDropdownOpen}
    onCloseDropdown={() => setIsDropdownOpen(false)}
    // ... all other props
  />,
  document.body,
)}
```

**Send behavior:** Enter key sends the message; Shift+Enter creates a new line:

```typescript
const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
};
```

**Info tooltip:** An `Info` icon in the top-right corner reveals example questions on hover (strategy, analysis, comparison categories).

**Dependencies:** `react` (useEffect, useRef, useState), `react-dom` (createPortal), `lucide-react` (Plus, Send, Paperclip, Info), `next-themes` (useTheme), `useI18n`, `FileUploadPreview`/`AttachedFile`, `useFileUpload`, `FLASHCARD_MAPPING`, `getAvailableAgents`/`AgentType`/`UserStatus`, `ModeSelector`, `FlashcardMenu`, `PortfolioMenu`, `SettingsMenu`, `MobileBottomSheets`.

---

### 2.2 ModeSelector

**File:** `src/components/chat-input/ModeSelector.tsx` (100 lines)

**Purpose:** Agent selection button and dropdown. Shows the current agent name in a branded pill button. Desktop dropdown renders three `ModeCard` items (Discover, Intelligence, Oracle). Mobile bottom sheet is rendered separately via `MobileBottomSheets`.

**Props Interface:**

```typescript
interface ModeSelectorProps {
  selectedAgent: AgentType;
  availableAgents: AgentType[];
  isOpen: boolean;
  onToggle: () => void;
  onAgentClick: (agent: AgentType) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  mounted: boolean;
}
```

**Key State Variables:** None -- controlled component.

**Notable Rendering Logic:**

The trigger button uses the brand color `#352ee8`:

```typescript
<button className="flex items-center gap-2 bg-[#352ee8] hover:bg-[#2920c7] rounded-full px-3 py-2 ...">
  <Image src="...flavicon_white.svg" ... />
  <span className="text-white font-medium text-sm capitalize truncate">{selectedAgent}</span>
  <ChevronDown className="h-4 w-4 text-white" />
</button>
```

The desktop dropdown is hidden on mobile (`hidden sm:block`) and positioned absolutely above the trigger (`bottom-full mb-2`) with opacity transition:

```typescript
<div className={`hidden sm:block absolute left-0 bottom-full mb-2 ...
  ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
```

**Dependencies:** `next/image`, `lucide-react` (ChevronDown), `ModeCard` from `./CategoryButton`, `AgentType` from `@/types/agents`.

---

### 2.3 FlashcardMenu

**File:** `src/components/chat-input/FlashcardMenu.tsx` (120 lines)

**Purpose:** Dual-purpose component for both "Learn Flashcards" and "Compare Rankings" menus. The `type` prop determines the icon, title, subtitle, and flashcard type sent on selection.

**Props Interface:**

```typescript
interface FlashcardMenuProps {
  type: "flashcard" | "ranking";
  isOpen: boolean;
  onToggle: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  selectedCategory: string | null;
  onCategorySelect: (
    category: string,
    flashCardType: "flash_invest" | "ranking",
  ) => void;
  mounted: boolean;
  isDark: boolean;
}
```

**Key Constants:**

```typescript
const CATEGORIES = [
  "Contemporary Art", "Prestigious Wines", "Luxury Bags", "Precious Jewelry",
  "Luxury Watch", "Collectible Cars", "Limited Sneakers", "Rare Whiskey",
  "Real Estate", "US sports cards",
];
```

**Notable Rendering Logic:**

Hidden on mobile (`hidden sm:block`) since mobile uses `MobileBottomSheets`. Renders a 2-column grid of `CategoryButton` items. The icon source switches based on `type` and dark mode:

```typescript
const iconSrc = isRanking
  ? (mounted && isDark ? "...ranking_b.svg" : "...ranking.svg")
  : (mounted && isDark ? "...chrono_b.svg" : "...chrono.svg");
```

**Dependencies:** `next/image`, `CategoryButton` from `./CategoryButton`.

---

### 2.4 PortfolioMenu

**File:** `src/components/chat-input/PortfolioMenu.tsx` (102 lines)

**Purpose:** Portfolio strategy tier selection dropdown. Shows investment tiers specific to the currently selected agent (Discover/Intelligence/Oracle).

**Props Interface:**

```typescript
interface PortfolioMenuProps {
  selectedAgent: AgentType;
  isOpen: boolean;
  onToggle: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onPortfolioClick: (tierName: string, subCategory: string) => void;
  mounted: boolean;
  isDark: boolean;
}
```

**Notable Rendering Logic:**

Tier data is selected based on the active agent:

```typescript
const tiers =
  selectedAgent === "oracle" ? ORACLE_PORTFOLIO_TIERS
    : selectedAgent === "intelligence" ? INTELLIGENCE_PORTFOLIO_TIERS
    : DISCOVER_PORTFOLIO_TIERS;
```

Hidden on mobile (`hidden sm:block`). Renders `CategoryButton` items in a 2-column grid.

**Dependencies:** `next/image`, `CategoryButton`, `AgentType`, `DISCOVER_PORTFOLIO_TIERS` / `INTELLIGENCE_PORTFOLIO_TIERS` / `ORACLE_PORTFOLIO_TIERS` from `@/lib/constants/portfolio-tiers`.

---

### 2.5 SettingsMenu

**File:** `src/components/chat-input/SettingsMenu.tsx` (147 lines)

**Purpose:** Settings dropdown with toggle options for "Market Scout" and "Community Radar" features. Both are currently disabled (coming soon).

**Props Interface:**

```typescript
interface SettingsMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  mounted: boolean;
  isDark: boolean;
}
```

**Notable Rendering Logic:**

Both toggle switches are rendered as disabled buttons with `opacity-50 cursor-not-allowed`:

```typescript
<button disabled className="... bg-gray-300 dark:bg-gray-600 opacity-50 cursor-not-allowed pointer-events-none">
  <span className="inline-block h-6 w-6 transform rounded-full bg-white translate-x-1" />
</button>
```

Each feature has an icon, title with "Coming Soon" superscript, and description text in French.

**Dependencies:** `next/image`, `useI18n` from `@/contexts/i18n-context`.

---

### 2.6 CategoryButton & ModeCard

**File:** `src/components/chat-input/CategoryButton.tsx` (120 lines)

**Purpose:** Two reusable UI primitives used across menus.

**CategoryButton Props:**

```typescript
interface CategoryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  isActive?: boolean;
  isDisabled?: boolean;
}
```

Renders a styled button with active ring indicator and disabled state. Exports a shared constant:

```typescript
export const CARD_BUTTON_STYLES =
  "p-4 bg-[#f0e7dd] dark:bg-[#1e1f20] text-gray-900 dark:text-white text-sm font-semibold rounded-2xl hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer border border-gray-400/60 dark:border-gray-600/60";
```

**ModeCard Props:**

```typescript
interface ModeCardProps {
  title: string;
  price: string;
  description: string;
  isActive: boolean;
  isAvailable: boolean;
  onClick: () => void;
  isMobile?: boolean;
}
```

Renders an agent mode card with title, price, description, active indicator (blue dot), and "Upgrade" button for unavailable tiers. Mobile mode adds touch feedback with programmatic scale animation:

```typescript
if (isMobile && isAvailable) {
  const element = e.currentTarget as HTMLElement;
  element.style.transform = "scale(0.95)";
  setTimeout(() => { element.style.transform = ""; onClick(); }, 100);
}
```

**Dependencies:** None (pure component).

---

### 2.7 MobileBottomSheets

**File:** `src/components/chat-input/MobileBottomSheets.tsx` (488 lines)

**Purpose:** All mobile bottom sheet overlays for the chat input toolbar. Rendered via React portal from `ChatInput`. Contains five bottom sheets: Mode Selector, File Upload Hub (with sub-levels for flashcards/ranking/portfolio), Chrono, Settings, and Ranking.

**Props Interface:**

```typescript
interface MobileBottomSheetsProps {
  // Mode selector
  isDropdownOpen: boolean;
  onCloseDropdown: () => void;
  selectedAgent: AgentType;
  availableAgents: AgentType[];
  onAgentClick: (agent: AgentType) => void;
  // File upload / hub menu
  isFileUploadOpen: boolean;
  onCloseFileUpload: () => void;
  mobileMenuLevel: "main" | "flashcards" | "ranking" | "portfolio";
  onMobileMenuLevelChange: (level: ...) => void;
  selectedCategory: string | null;
  onFlashcardClick: (category: string, flashCardType: "flash_invest" | "ranking") => void;
  onPortfolioClick: (tierName: string, subCategory: string) => void;
  // Chrono, Settings, Ranking
  isChronoOpen: boolean;
  onCloseChono: () => void;
  isSettingsOpen: boolean;
  onCloseSettings: () => void;
  isRankingOpen: boolean;
  onCloseRanking: () => void;
  // Common
  mounted: boolean;
  isDark: boolean;
}
```

**Notable Rendering Logic:**

Each bottom sheet follows the same pattern -- a backdrop overlay and a slide-up panel:

```typescript
{/* Backdrop */}
<div className={`sm:hidden fixed inset-0 bg-black/50 z-40 transition-opacity ...
  ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
  onClick={onClose} />
{/* Panel */}
<div className={`sm:hidden fixed inset-x-0 bottom-0 z-50 transition-transform ...
  ${isOpen ? "translate-y-0" : "translate-y-full"}`}>
```

The File Upload Hub has multi-level navigation (`mobileMenuLevel`) with a back button to return to the main menu. Mobile categories use abbreviated names:

```typescript
const MOBILE_CATEGORIES = [
  "Contemp. Art", "Luxury Bags", "Prestigious Wines", ...
];
```

**Dependencies:** `next/image`, `lucide-react` (Paperclip), `useI18n`, `CategoryButton` + `CARD_BUTTON_STYLES` + `ModeCard`, `AgentType`, portfolio tier constants.

---

### 2.8 index.ts (Barrel Export)

**File:** `src/components/chat-input/index.ts` (1 line)

```typescript
export { ChatInput } from "./ChatInput";
```

Single re-export for clean import: `import { ChatInput } from "@/components/chat-input"`.

---

## 3. ui/ Components (shadcn/ui)

Standard shadcn/ui components with the "new-york" style and zinc base color. All use `cn()` utility from `@/lib/utils` for class merging.

### 3.1 Button

**File:** `src/components/ui/button.tsx` (58 lines)

**Purpose:** Polymorphic button with variant and size props. Uses `class-variance-authority` for variant management.

**Props Interface:**

```typescript
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}
```

**Variants:**

| Variant | Description |
|---------|-------------|
| `default` | Primary with shadow |
| `destructive` | Red destructive action |
| `outline` | Bordered with background |
| `secondary` | Secondary color |
| `ghost` | No background, hover accent |
| `link` | Text with underline |

**Sizes:** `default` (h-9), `sm` (h-8), `lg` (h-10), `icon` (h-9 w-9).

Uses `@radix-ui/react-slot` for the `asChild` pattern, allowing the button to render as its child element.

**Dependencies:** `@radix-ui/react-slot`, `class-variance-authority`, `@/lib/utils`.

---

### 3.2 Card

**File:** `src/components/ui/card.tsx` (77 lines)

**Purpose:** Composable card component with sub-components: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`.

All are `React.forwardRef` wrappers with `cn()` class merging. Base card style: `rounded-xl border bg-card text-card-foreground shadow`.

**Dependencies:** `@/lib/utils`.

---

### 3.3 Input

**File:** `src/components/ui/input.tsx` (25 lines)

**Purpose:** Styled input element with focus ring, placeholder styling, and disabled states.

Base style includes `h-10 w-full rounded-md border` with focus ring offset.

**Dependencies:** `@/lib/utils`.

---

### 3.4 DropdownMenu

**File:** `src/components/ui/dropdown-menu.tsx` (202 lines)

**Purpose:** Full dropdown menu system built on `@radix-ui/react-dropdown-menu`. Exports 14 sub-components.

**Exported Components:** `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuShortcut`, `DropdownMenuGroup`, `DropdownMenuPortal`, `DropdownMenuSub`, `DropdownMenuSubContent`, `DropdownMenuSubTrigger`, `DropdownMenuRadioGroup`.

All include entrance/exit animations via Tailwind `animate-in`/`animate-out` classes.

**Dependencies:** `@radix-ui/react-dropdown-menu`, `lucide-react` (Check, ChevronRight, Circle), `@/lib/utils`.

---

### 3.5 Chart

**File:** `src/components/ui/chart.tsx` (372 lines)

**Purpose:** Chart infrastructure wrapping Recharts with shadcn/ui theming. Provides `ChartContainer` (responsive wrapper with CSS variable injection), `ChartTooltipContent` (styled tooltip), and `ChartLegendContent` (styled legend).

**Key Types:**

```typescript
export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  );
};
```

**ChartStyle** injects CSS custom properties (`--color-{key}`) via a `<style>` tag, enabling theme-aware colors for Recharts components.

**Dependencies:** `recharts`, `@/lib/utils`.

---

## 4. share/ Components

### 4.1 CopyButton

**File:** `src/components/share/CopyButton.tsx` (40 lines)

**Purpose:** Reusable copy-to-clipboard button with visual feedback (check icon for 2 seconds after copy). Used in shared conversation views.

**Props Interface:**

```typescript
interface CopyButtonProps {
  content: string;
  className?: string;
}
```

**Key State Variables:**

```typescript
const [copied, setCopied] = useState(false);
```

**Dependencies:** `react` (useState), `@/components/ui/button`, `lucide-react` (Copy, Check), `sonner` (toast).

---

### 4.2 SharedMessageList

**File:** `src/components/share/SharedMessageList.tsx` (78 lines)

**Purpose:** Read-only message list for publicly shared conversations (accessed via `/share/[token]`). Contains an internal `SharedMessageItem` component.

**Props Interface:**

```typescript
interface SharedMessageListProps {
  messages: Message[];
}

// Internal Message type (simplified from main Message type)
interface Message {
  id: number;
  content: string;
  sender: "user" | "ai";
  created_at: string;
}
```

**Notable Rendering Logic:**

The `SharedMessageItem` (memoized) renders user messages as plain text and AI messages with the `Markdown` component. User messages show a generic "U" avatar circle; AI messages use `AIAvatar`. Copy buttons appear on hover:

```typescript
<CopyButton
  content={message.content}
  className={`absolute bottom-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 ...`}
/>
```

Empty state: shows "No messages in this conversation."

**Dependencies:** `react` (Suspense, memo), `Markdown`, `CopyButton`, `AIAvatar`.

---

## 5. Top-Level Components

### 5.1 Markdown

**File:** `src/components/Markdown.tsx` (180 lines)

**Purpose:** Central markdown rendering component. Converts markdown to HTML using `marked`, then applies a pipeline of custom HTML transforms for tables, rankings, allocation profiles, bar charts, scatter plots, and more. Supports interactive elements: analysis markers (`-+-text-+-`) and chat buttons (`++text++`).

**Props Interface:**

```typescript
interface MarkdownProps {
  content: string;
  className?: string;
  categoryName?: string;
  onCategoryClick?: () => void;
}
```

**Key State Variables:**

```typescript
const [htmlContent, setHtmlContent] = useState<string>("");
```

**Notable Rendering Logic:**

**Transform pipeline** (executed in order inside a `useEffect`):

```typescript
html = await marked(content);
html = convertAllocationProfilesToHtml(html);   // 1. Allocation profiles
html = convertScatterPlotsToHtml(html);          // 1b. Scatter plots
html = convertBarChartsToHtml(html);             // 2. Bar charts
html = convertPerfBarsToHtml(html);              // 2b. Performance bars
html = convertComparisonBarsToHtml(html);        // 2c. Comparison bars
html = convertAsciiTablesToHtml(html);           // 3. ASCII tables
html = convertExtendedRankingsToHtml(html);      // 4a. Extended rankings
html = convertRankingListsToHtml(html);          // 4b. Simple rankings
html = convertMarkdownTablesToStyledHtml(html);  // 5. Standard tables
html = convertAnalysisMarkers(html);             // 6. Analysis markers
html = convertChatButtons(html);                 // 7. Chat buttons
```

**Analysis markers** (`-+-text-+-`) are converted to clickable spans that dispatch a `triggerDeepSearch` custom event:

```typescript
const convertAnalysisMarkers = (text: string): string => {
  return text.replace(/-\+-(.+?)-\+-/g, (match, word) => {
    return `<span data-analysis class="... border-l-4 border-orange-500 ...">${word}</span>`;
  });
};
```

**Chat buttons** (`++text++`) are converted to a 2-column grid of buttons that dispatch `triggerChatButton` custom events:

```typescript
const convertChatButtons = (html: string): string => {
  let result = html.replace(/\+\+(.+?)\+\+/g, (_, label) =>
    `<button data-chat-button class="chat-btn-grid-item">${label}</button>`
  );
  // Merge consecutive button paragraphs into a grid container
  result = result.replace(
    /(?:<p>\s*(?:<button data-chat-button[^>]*>.*?<\/button>\s*)+<\/p>\s*)+/g,
    (match) => { /* collect buttons into div.chat-btn-grid */ }
  );
  return result;
};
```

**Click handler** catches clicks on `[data-analysis]` and `[data-chat-button]` elements using event delegation:

```typescript
const handleClick = (event: React.MouseEvent) => {
  const chatButtonElement = target.closest('[data-chat-button]');
  if (chatButtonElement) {
    window.dispatchEvent(new CustomEvent("triggerChatButton", { detail: { text } }));
    return;
  }
  const analysisElement = target.closest('[data-analysis]');
  if (analysisElement) {
    window.dispatchEvent(new CustomEvent("triggerDeepSearch", { detail: { text } }));
  }
};
```

Content is rendered via `dangerouslySetInnerHTML`.

**Dependencies:** `react` (useEffect, useState), `marked`, nine transform functions from `@/lib/markdown-utils`.

---

### 5.2 ArtistCard

**File:** `src/components/ArtistCard.tsx` (135 lines)

**Purpose:** Rich artist profile card for art investment context. Displays artist image (or fallback initial), name, research type badge, country, artwork count, and two `MetricBadge` components for sell ratio and social score.

**Props Interface:**

```typescript
interface Artist {
  artist_name: string;
  artist_picture_url: string | null;
  primary_country: string | null;
  country_iso_code: string | null;
  total_artworks: number | null;
  ratio_sold?: number;    // Float 0-1
  social_score?: number;  // Float 0-1
}

interface ArtistCardProps {
  artist: Artist;
  message?: string;
  researchType?: string;
  text?: string;
  streamingText?: string;
  hasExistingData?: boolean;
}
```

**Notable Rendering Logic:**

Conditionally renders streaming text (when `hasExistingData` is true) and analysis text via the `Markdown` component. Stats grid only renders when at least one field has data. Fallback avatar shows the first letter of the artist name:

```typescript
<span className="text-6xl font-bold text-gray-300 dark:text-gray-700 select-none">
  {artist.artist_name.charAt(0).toUpperCase()}
</span>
```

**Dependencies:** `next/image`, `lucide-react` (MapPin, Image), `Card` from `@/components/ui/card`, `Markdown`, `MetricBadge`.

---

### 5.3 ArtistDashboard

**File:** `src/components/ArtistDashboard.tsx` (176 lines)

**Purpose:** Full-page dashboard with four Recharts visualizations for artist investment analysis: Price Distribution (bar chart), Value Projection (line chart), Portfolio Allocation (donut/pie chart), and Prophetic Score (radar chart).

**Exported Components:**

```typescript
export function PriceDistributionChart()   // Horizontal bar chart
export function ValueProjectionChart()     // Line chart with CAGR projection
export function PortfolioAllocationChart() // Donut/pie chart
export function ScoreBreakdownChart()      // Radar chart with 5 metrics
```

Each chart uses hardcoded sample data and the `ChartContainer`/`ChartTooltip`/`ChartLegend` infrastructure from `@/components/ui/chart`.

**Dependencies:** `recharts` (Bar, BarChart, CartesianGrid, XAxis, YAxis, Line, LineChart, Pie, PieChart, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis), `Card`/`CardContent`/`CardDescription`/`CardHeader`/`CardTitle`, chart components from `@/components/ui/chart`.

---

### 5.4 MarketplaceCard

**File:** `src/components/MarketplaceCard.tsx` (136 lines)

**Purpose:** Displays art marketplace search results in a responsive grid. Supports marketplace-specific color theming (Saatchi blue, Artsy purple, generic gray). Returns `null` when data indicates failure (`!found || error_message`).

**Props Interface:**

```typescript
interface MarketplaceCardProps {
  data: MarketplaceData;
}

interface MarketplaceData {
  found: boolean;
  marketplace: string;
  artist_profile?: ArtistProfile | null;
  artworks?: Artwork[];
  total_artworks?: number;
  error_message?: string | null;
  search_metadata?: Record<string, unknown>;
}
```

**Notable Rendering Logic:**

Artworks are limited to 6 items and displayed in a 1/2/3 column responsive grid. Each artwork card has a hover zoom effect on the image and an external link overlay:

```typescript
<Image ... className="object-cover group-hover:scale-110 transition-transform duration-500" />
<div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 ... flex items-center justify-center">
  <ExternalLink className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 ..." />
</div>
```

Memoized with `React.memo`.

**Dependencies:** `next/image`, `lucide-react` (ExternalLink, Store, CheckCircle2), `Card`, `react` (memo).

---

### 5.5 RealEstateCard

**File:** `src/components/RealEstateCard.tsx` (135 lines)

**Purpose:** Displays real estate property listings in a 2x2 / 4-column grid with price badges. Follows the same visual style as VignetteGridCard (rounded-[24px], bg-[#e6e6e6]).

**Props Interface:**

```typescript
interface RealEstateCardProps {
  data: RealEstateData;
}

export interface RealEstateData {
  found: boolean;
  marketplace: string;
  location: string;
  properties: RealEstateProperty[];
  total_properties: number;
  search_url?: string;
  title?: string;
  subtitle?: string;
  // ...
}

export interface RealEstateProperty {
  title: string;
  price: string;
  price_amount: number;
  price_currency: string;
  url: string;
  image_url: string;
  bedrooms?: number;
  bathrooms?: number;
  square_meters?: number;
  property_type: string;
  // ...
}
```

**Notable Rendering Logic:**

Price formatting uses K/M abbreviations:

```typescript
const formatPrice = (amount: number): string => {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(amount % 1000000 === 0 ? 0 : 1)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
  return amount.toLocaleString();
};
```

Properties are limited to 4 items. Fallback image shows a `Home` icon.

**Dependencies:** `next/image`, `lucide-react` (Home, XCircle), `Card`, `react` (memo).

---

### 5.6 VignetteGridCard

**File:** `src/components/VignetteGridCard.tsx` (80 lines)

**Purpose:** Displays investment category vignettes in a 2-column grid. Each vignette shows an image, score badge with trend arrow, brand name, and subtitle.

**Props Interface:**

```typescript
interface VignetteGridCardProps {
  data: VignetteData[];
  onVignetteClick?: (vignette: VignetteData) => void;
}
```

**Notable Rendering Logic:**

Score badge with trend indicator:

```typescript
{item.score != null && item.trend != null && (
  <div className="absolute bottom-3 right-3 flex items-center gap-1">
    <div className="bg-white rounded-full px-3 py-1.5 shadow-md flex items-center gap-1">
      <span className="text-sm font-semibold text-gray-900">{item.score}</span>
      <span className={`text-base ${item.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
        {item.trend === 'up' ? '\u25B2' : '\u25BC'}
      </span>
    </div>
  </div>
)}
```

Consistent visual style: `border border-gray-200/20 bg-[#e6e6e6] dark:bg-gray-800 rounded-[24px] p-3`.

**Dependencies:** `next/image`, `react` (memo), `VignetteData` from `@/types/vignettes`.

---

### 5.7 ClothesSearchCard

**File:** `src/components/ClothesSearchCard.tsx` (142 lines)

**Purpose:** Displays fashion/luxury item search results in a grid matching the VignetteGridCard visual style. Contains a parent `ClothesSearchCard` and an internal `ProductCard` component.

**Exported Types:**

```typescript
export interface ClothesSearchData {
  type: "clothes_search_response";
  query: string;
  total_listings: number;
  successful_marketplaces: number;
  failed_marketplaces: number;
  marketplace_breakdown: Record<string, MarketplaceBreakdown>;
  listings: ClothesListing[];
  error_message: string | null;
  title?: string;
  subtitle?: string;
}
```

**Props Interface:**

```typescript
interface ClothesSearchCardProps {
  data: ClothesSearchData;
}
```

**Key State Variables (ProductCard):**

```typescript
const [imageError, setImageError] = useState(false);
```

**Notable Rendering Logic:**

Filters listings to only those with images, limits to 4. Price formatting abbreviates values over 10K:

```typescript
const formatPrice = (price: number | null): string => {
  if (price === null || price === undefined) return "N/A";
  if (price >= 10000) return `${(price / 1000).toFixed(0)}K`;
  return price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};
```

Image error fallback shows a `ShoppingBag` icon.

**Dependencies:** `next/image`, `lucide-react` (ShoppingBag), `react` (memo, useState).

---

### 5.8 FileUploadPreview

**File:** `src/components/FileUploadPreview.tsx` (98 lines)

**Purpose:** Shows a preview list of files being uploaded or already attached to a message. Displays file name, size, upload status (pending/uploading/completed/error), progress bar, and remove/retry buttons.

**Exported Types:**

```typescript
export interface AttachedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  uploadStatus: 'pending' | 'uploading' | 'completed' | 'error';
  uploadProgress: number;
  url?: string;
  path?: string;
  error?: string;
}
```

**Props Interface:**

```typescript
interface FileUploadPreviewProps {
  files: AttachedFile[];
  onRemove: (fileId: string) => void;
  onRetry?: (fileId: string) => void;
}
```

Returns `null` when `files.length === 0`.

**Dependencies:** `lucide-react` (X, AlertCircle, Loader2), `formatFileSize` from `@/lib/utils/fileValidation`.

---

### 5.9 FileAttachment

**File:** `src/components/FileAttachment.tsx` (71 lines)

**Purpose:** Displays a file attachment in a message with icon, name, size, and download link. Image files show a thumbnail preview; other types show a type-specific icon.

**Props Interface:**

```typescript
interface FileAttachmentProps {
  url: string;
  name: string;
  size: number;
  type: string;
}
```

**Notable Rendering Logic:**

Icon selection by MIME type:

```typescript
function getFileIcon(mimeType: string) {
  const fileType = getFileType(mimeType);
  switch (fileType) {
    case 'document': return <FileText .../>;
    case 'video':    return <Video .../>;
    case 'audio':    return <Music .../>;
    case 'archive':  return <Archive .../>;
    default:         return <File .../>;
  }
}
```

**Dependencies:** `next/image`, `lucide-react` (Download, FileText, File, Video, Music, Archive), `formatFileSize` + `getFileType` from `@/lib/utils/fileValidation`.

---

### 5.10 SelectionContextMenu

**File:** `src/components/SelectionContextMenu.tsx` (75 lines)

**Purpose:** Custom right-click context menu that appears when text is selected. Provides a "Deep Search" action that dispatches a `triggerDeepSearch` custom event, which the chat page catches to perform an AI analysis of the selected text.

**Props Interface:** None -- standalone component.

**Key State Variables:**

```typescript
const [isVisible, setIsVisible] = useState(false);
const [position, setPosition] = useState({ x: 0, y: 0 });
const [selectedText, setSelectedText] = useState("");
```

**Notable Rendering Logic:**

Listens to the global `contextmenu` event. If text is selected, prevents default and shows the custom menu at cursor position:

```typescript
const handleContextMenu = useCallback((e: MouseEvent) => {
  const selection = window.getSelection();
  const text = selection?.toString().trim();
  if (text && text.length > 0) {
    e.preventDefault();
    setSelectedText(text);
    setPosition({ x: e.clientX, y: e.clientY });
    setIsVisible(true);
  } else {
    setIsVisible(false);
  }
}, []);
```

The "Deep Search" button dispatches:

```typescript
const event = new CustomEvent("triggerDeepSearch", { detail: { text: selectedText } });
window.dispatchEvent(event);
```

**Dependencies:** `react` (useState, useEffect, useCallback), `lucide-react` (Search), `useI18n`.

---

### 5.11 ModelSelector

**File:** `src/components/ModelSelector.tsx` (78 lines)

**Purpose:** Admin-only dropdown for selecting the AI model. Groups models by company (Anthropic, OpenAI, Mistral, etc.) with descriptions.

**Props Interface:**

```typescript
interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
}
```

**Notable Rendering Logic:**

Iterates over `AI_COMPANIES` from `@/lib/models`, rendering each company as a `DropdownMenuLabel` section with its models as `DropdownMenuItem` entries:

```typescript
{Object.values(AI_COMPANIES).map((company) => (
  <div key={company.id}>
    <DropdownMenuLabel className="text-xs font-semibold uppercase ...">
      {company.name}
    </DropdownMenuLabel>
    {company.models.map((model) => (
      <DropdownMenuItem key={model.id} onClick={() => onModelChange(model.id)} ...>
        <span className="font-medium">{model.name}</span>
        {selectedModel === model.id && <Check className="h-4 w-4 text-blue-600" />}
        <p className="text-xs text-muted-foreground">{model.description}</p>
      </DropdownMenuItem>
    ))}
    <DropdownMenuSeparator />
  </div>
))}
```

**Dependencies:** `@/components/ui/button`, `@/components/ui/dropdown-menu`, `lucide-react` (Check, ChevronDown, Sparkles), `AI_COMPANIES` + `getCompanyFromModelId` from `@/lib/models`.

---

### 5.12 ThemeToggle

**File:** `src/components/ThemeToggle.tsx` (59 lines)

**Purpose:** Light/Dark/System theme selector using a dropdown menu. Shows the current theme icon (Sun/Moon/Monitor).

**Key State Variables:**

```typescript
const { theme, setTheme } = useTheme();
const [mounted, setMounted] = useState(false);
```

The `mounted` guard avoids hydration mismatch. Before mounting, renders a placeholder Sun icon button.

**Dependencies:** `lucide-react` (Moon, Sun, Monitor), `next-themes` (useTheme), `@/components/ui/button`, `@/components/ui/dropdown-menu`.

---

### 5.13 ShareButton

**File:** `src/components/ShareButton.tsx` (101 lines)

**Purpose:** Creates a shareable link for the current conversation. Calls `POST /api/conversations/[id]/share` to generate a share token, then copies the URL to clipboard.

**Props Interface:**

```typescript
interface ShareButtonProps {
  conversationId: number | null;
  disabled?: boolean;
}
```

**Key State Variables:**

```typescript
const [isLoading, setIsLoading] = useState(false);
```

**Notable Rendering Logic:**

Includes a clipboard fallback for environments where the Clipboard API fails:

```typescript
const copyToClipboardFallback = (text: string): boolean => {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-999999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  const result = document.execCommand("copy");
  document.body.removeChild(textArea);
  return result;
};
```

If both clipboard methods fail, the share URL is shown in a toast for manual copy.

**Dependencies:** `react` (useState), `lucide-react` (Share2), `@/components/ui/button`, `sonner` (toast).

---

### 5.14 TypingIndicator

**File:** `src/components/TypingIndicator.tsx` (32 lines)

**Purpose:** Three bouncing dots animation indicating the AI is generating a response.

**Props Interface:** None.

**Notable Rendering Logic:**

```typescript
export const TypingIndicator = memo(() => {
  return (
    <span className="inline-flex gap-1 items-center ml-1" role="status" aria-label="Loading response">
      <span className="w-2 h-2 bg-gray-900 dark:bg-white rounded-full animate-bounce"
        style={{ animationDelay: "0ms", animationDuration: "0.8s" }} />
      <span className="w-2 h-2 bg-gray-900 dark:bg-white rounded-full animate-bounce"
        style={{ animationDelay: "200ms", animationDuration: "0.8s" }} />
      <span className="w-2 h-2 bg-gray-900 dark:bg-white rounded-full animate-bounce"
        style={{ animationDelay: "400ms", animationDuration: "0.8s" }} />
    </span>
  );
});
```

Staggered delays (0ms, 200ms, 400ms) create a wave pattern. Accessible with `role="status"` and `aria-label`.

**Dependencies:** `react` (memo).

---

### 5.15 LinkPreview

**File:** `src/components/LinkPreview.tsx` (150 lines)

**Purpose:** Fetches and displays a rich preview card for URLs (title, description, image, favicon, site name). Falls back to a plain link on error or missing data.

**Props Interface:**

```typescript
interface LinkPreviewProps {
  url: string;
  children?: React.ReactNode;
}
```

**Key State Variables:**

```typescript
const [previewData, setPreviewData] = useState<LinkPreviewData | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(false);
```

**Notable Rendering Logic:**

Fetches from `/api/link-preview?url=...` on mount. Three render states:

1. **Loading:** Plain hyperlink
2. **Error/no data:** Plain hyperlink
3. **Success:** Rich card with image section (optional), favicon, site name, title, description, and hostname

Image errors are handled by hiding the element:

```typescript
onError={(e) => {
  const target = e.target as HTMLElement;
  target.style.display = "none";
}}
```

**Dependencies:** `react` (useEffect, useState), `lucide-react` (ExternalLink, Globe), `next/image`.

---

### 5.16 MetricBadge

**File:** `src/components/MetricBadge.tsx` (133 lines)

**Purpose:** Luxury-styled badge for displaying metric values (sell ratio or social score). Uses glassmorphism with color-coded gradients: red (low, < 30%), amber (medium, 30-70%), emerald/green (high, > 70%).

**Props Interface:**

```typescript
interface MetricBadgeProps {
  ratio: number;     // Float 0-1
  type: "sell" | "social";
  className?: string;
}
```

**Notable Rendering Logic:**

Renders icon + label + raw score + percentage + status badge in a pill shape with hover scale effect:

```typescript
<div className={`group relative inline-flex items-center gap-2.5 px-4 py-2.5
  rounded-full border bg-gradient-to-r ${style.gradient} ${style.border}
  backdrop-blur-sm shadow-lg ${style.glow}
  hover:scale-105 hover:shadow-xl ...`}>
  <Icon className={`w-4 h-4 ${style.icon} ...`} />
  <span className="text-base font-bold ...">{clampedRatio.toFixed(2)}</span>
  <span className="text-xs ...">({percentage}%)</span>
  <span className="text-[10px] ... rounded-full">{style.label}</span>
  {/* Shimmer effect on hover */}
  <div className="absolute inset-0 ... bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 ..." />
</div>
```

**Dependencies:** `react` (memo), `lucide-react` (TrendingUp, Users).

---

### 5.17 SellStatusBar

**File:** `src/components/SellStatusBar.tsx` (88 lines)

**Purpose:** Horizontal progress bar for sell ratio display. Color-coded: red (< 30%), orange (30-70%), green (> 70%).

**Props Interface:**

```typescript
interface SellStatusBarProps {
  ratio: number;     // Float 0-1
  className?: string;
}
```

**Notable Rendering Logic:**

```typescript
<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
  <div
    className={`${color} h-full rounded-full transition-all duration-300 ease-out`}
    style={{ width: `${percentage}%` }}
    role="progressbar"
    aria-valuenow={percentage}
    aria-valuemin={0}
    aria-valuemax={100}
  />
</div>
```

**Dependencies:** `react` (memo).

---

### 5.18 SocialScoreBar

**File:** `src/components/SocialScoreBar.tsx` (88 lines)

**Purpose:** Identical to `SellStatusBar` but labeled "Social Score" instead of "Sell Ratio". Same color thresholds and progress bar implementation.

**Props Interface:**

```typescript
interface SocialScoreBarProps {
  ratio: number;     // Float 0-1
  className?: string;
}
```

**Dependencies:** `react` (memo).

---

### 5.19 GoogleDrivePicker

**File:** `src/components/GoogleDrivePicker.tsx` (260 lines)

**Purpose:** Google Drive file picker integration. Loads Google API scripts, authenticates via OAuth2, opens the native Google Picker UI, and downloads selected files. Exports both a component function and a `useGoogleDrivePicker` hook.

**Props Interface:**

```typescript
interface GoogleDrivePickerProps {
  onFilesSelected: (files: File[]) => void;
  onError?: (error: string) => void;
}
```

**Key State Variables:**

```typescript
const [pickerApiLoaded, setPickerApiLoaded] = useState(false);
const [gisLoaded, setGisLoaded] = useState(false);
const [oauthToken, setOauthToken] = useState<string | null>(null);
```

**Notable Rendering Logic:**

This is not a visual component -- it returns `{ createPicker }` instead of JSX. The companion hook wraps it:

```typescript
export function useGoogleDrivePicker(
  onFilesSelected: (files: File[]) => void,
  onError?: (error: string) => void
) {
  const { createPicker } = GoogleDrivePicker({ onFilesSelected, onError });
  return { openGoogleDrivePicker: createPicker };
}
```

Script loading happens in `useEffect`:

```typescript
useEffect(() => {
  const gapiScript = document.createElement('script');
  gapiScript.src = 'https://apis.google.com/js/api.js';
  gapiScript.onload = () => {
    window.gapi?.load('client:picker', () => setPickerApiLoaded(true));
  };
  document.body.appendChild(gapiScript);
  // + Google Identity Services script
}, []);
```

Requires environment variables: `NEXT_PUBLIC_GOOGLE_API_KEY`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_GOOGLE_APP_ID`.

**Dependencies:** `react` (useEffect, useState), `sonner` (toast).

---

## Component Dependency Graph (Summary)

```
ChatInput
  +-- ModeSelector --> CategoryButton (ModeCard)
  +-- FlashcardMenu --> CategoryButton
  +-- PortfolioMenu --> CategoryButton
  +-- SettingsMenu
  +-- MobileBottomSheets --> CategoryButton, ModeCard
  +-- FileUploadPreview

ConversationView
  +-- MessageItem --> AIAvatar, Markdown, ArtistCard, MarketplaceCard,
  |                   RealEstateCard, VignetteGridCard, ClothesSearchCard
  +-- StreamingBubble --> AIAvatar, TypingIndicator, Markdown, MarketplaceCard,
  |                       RealEstateCard, VignetteGridCard, ClothesSearchCard
  +-- TypingIndicator
  +-- ChatInput

WelcomeScreen
  +-- MessageItem
  +-- Markdown (lazy)
  +-- VignetteGridCard (lazy)
  +-- ChatInput

ChatHeader
  +-- ModelSelector --> Button, DropdownMenu
  +-- ThemeToggle --> Button, DropdownMenu
  +-- ShareButton --> Button

ArtistCard --> Markdown, MetricBadge, Card
SharedMessageList --> SharedMessageItem --> Markdown, CopyButton, AIAvatar
```
