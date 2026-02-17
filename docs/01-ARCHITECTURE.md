# Architecture Overview

**Prophetic Orchestra 7.5** — Luxury investment advisor chatbot built with Next.js 15 App Router.

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Application Bootstrap](#2-application-bootstrap)
3. [Directory Structure](#3-directory-structure)
4. [Rendering Architecture](#4-rendering-architecture)
5. [Data Flow Patterns](#5-data-flow-patterns)
6. [State Management](#6-state-management)
7. [Theming & Design System](#7-theming--design-system)
8. [Deployment & Configuration](#8-deployment--configuration)

---

## 1. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Framework** | Next.js (App Router, Turbopack) | 15.3.2 |
| **Language** | TypeScript (strict mode) | 5.8.3 |
| **UI Library** | React | 18.3.1 |
| **Styling** | Tailwind CSS + CSS variables | 3.4.17 |
| **Component Kit** | shadcn/ui (new-york style, zinc base) | — |
| **Authentication** | NextAuth v5 (beta 29) | 5.0.0-beta.29 |
| **Database/Auth** | Supabase (PostgreSQL + Auth + Storage) | 2.75.0 |
| **Markdown** | react-markdown + remark-gfm + marked | 10.1.0 / 17.0.1 |
| **Charts** | Recharts | 3.7.0 |
| **Icons** | Lucide React | 0.546.0 |
| **Toast** | Sonner | 2.0.7 |
| **Theming** | next-themes | 0.4.6 |
| **Formatter** | Biome | 1.9.4 |
| **Linter** | ESLint (Next.js config) | 9.27.0 |

### Key Dependencies

```json
{
  "cheerio": "^1.2.0",        // HTML parsing (link previews)
  "html2pdf.js": "^0.14.0",   // PDF export of messages
  "nanoid": "^5.1.6",         // Unique ID generation
  "same-runtime": "^0.0.1",   // Runtime configured in tsconfig
  "class-variance-authority": "^0.7.1",  // Variant-based component styling
  "tailwind-merge": "^3.3.0"  // Intelligent Tailwind class merging
}
```

---

## 2. Application Bootstrap

### Root Layout (`src/app/layout.tsx`)

The root layout is a **Server Component** that sets up:

```typescript
// Three Google fonts loaded
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const spectral = Spectral({ variable: "--font-spectral", subsets: ["latin"], weight: ["400"] });

// Applied to <html> element
<html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${spectral.variable}`} suppressHydrationWarning>
```

**Component tree:**
```
<html>
  <head>
    <Script src="same-runtime/dist/index.global.js" strategy="afterInteractive" />
  </head>
  <body suppressHydrationWarning>
    <Providers>           ← SessionProvider + ThemeProvider + I18nProvider
      <ClientBody>        ← Hydration fix for browser extensions
        {children}
      </ClientBody>
      <Toaster />         ← Sonner toast notifications (top-center)
    </Providers>
  </body>
</html>
```

### Providers (`src/app/providers.tsx`)

```typescript
export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>                                          // NextAuth session
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>  // Dark/light mode
        <I18nProvider>                                          // 9-language i18n
          {children}
        </I18nProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
```

Provider nesting order: **Session → Theme → I18n → App**

### ClientBody (`src/app/ClientBody.tsx`)

Fixes hydration mismatches caused by browser extensions that inject classes into `<body>`:

```typescript
export default function ClientBody({ children }) {
  useEffect(() => {
    document.body.className = "antialiased";  // Reset extension-added classes
  }, []);
  return <div className="antialiased">{children}</div>;
}
```

### Root Page (`src/app/page.tsx`)

Simple redirect logic:
- `NEXT_PUBLIC_SKIP_AUTH=true` → redirect to `/chat`
- Authenticated → redirect to `/chat`
- Unauthenticated → redirect to `/login`
- Loading → shows animated Prophetic logo

---

## 3. Directory Structure

```
src/
├── app/                          # Next.js App Router (pages + API routes)
│   ├── page.tsx                  # Root redirect (→ /chat or /login)
│   ├── layout.tsx                # Root layout (Server Component)
│   ├── providers.tsx             # Client providers wrapper
│   ├── ClientBody.tsx            # Hydration fix
│   ├── globals.css               # Tailwind + CSS variables + design system
│   │
│   ├── chat/                     # Main application
│   │   ├── layout.tsx            # Sidebar + conversation list + category nav
│   │   └── [[...conversationId]]/
│   │       └── page.tsx          # Chat orchestrator page (~420 lines)
│   │
│   ├── login/page.tsx            # Authentication page
│   ├── registration-pending/     # Waiting for admin approval
│   ├── restricted-access/        # Staging/preprod gate
│   ├── share/[token]/page.tsx    # Public shared conversations
│   │
│   └── api/                      # API routes (13 endpoints)
│       ├── auth/                 # NextAuth + magic link
│       ├── conversations/        # CRUD + messages + sharing + vignettes
│       ├── vignettes/            # Investment category content
│       ├── markdown/             # SSE markdown streaming
│       ├── upload/               # File upload
│       ├── link-preview/         # URL metadata extraction
│       └── geolocation/          # Language detection
│
├── components/                   # React components (35 files)
│   ├── chat/                     # Chat UI (MessageItem, ConversationView, etc.)
│   ├── chat-input/               # Input components (ChatInput, ModeSelector, etc.)
│   ├── ui/                       # shadcn/ui primitives
│   ├── share/                    # Shared conversation components
│   └── [various].tsx             # Cards, previews, selectors
│
├── hooks/                        # Custom React hooks (2 files)
│   ├── useChatConversation.ts    # Core chat logic (~800 lines)
│   └── useFileUpload.ts          # File upload with retry
│
├── contexts/                     # React contexts (2 files)
│   ├── sidebar-context.tsx       # Sidebar state + mobile detection
│   └── i18n-context.tsx          # Internationalization
│
├── types/                        # TypeScript definitions (4 files)
│   ├── chat.ts                   # Message, marketplace, real estate types
│   ├── agents.ts                 # Agent types + access control
│   ├── vignettes.ts              # Vignette types + enums
│   └── next-auth.d.ts            # Session type extensions
│
├── lib/                          # Utilities (13 files)
│   ├── supabase/                 # Supabase clients (public, admin, server, storage)
│   ├── constants/                # Portfolio tiers, flashcard mappings
│   ├── utils/                    # File validation
│   ├── utils.ts                  # cn() class merger
│   ├── models.ts                 # AI model configurations
│   ├── translations.ts           # i18n translations (9 languages)
│   └── markdown-utils.ts         # HTML table/ranking transforms
│
├── auth.ts                       # NextAuth configuration
└── middleware.ts                  # Route protection + access control
```

---

## 4. Rendering Architecture

### Page Routing

| Route | Type | Purpose |
|-------|------|---------|
| `/` | Client | Redirect to `/chat` or `/login` |
| `/chat` | Client | Welcome screen with vignettes |
| `/chat/[id]` | Client | Conversation view |
| `/login` | Client | Google OAuth + Magic Link |
| `/registration-pending` | Client | Unauthorized holding page |
| `/restricted-access` | Client | Staging/preprod gate |
| `/share/[token]` | Client | Public shared conversation |

### Chat Page Architecture (`src/app/chat/[[...conversationId]]/page.tsx`)

The chat page is the main orchestrator. It uses an **optional catch-all** route (`[[...conversationId]]`) to handle both:
- `/chat` → Welcome screen (no conversationId)
- `/chat/123` → Conversation view (conversationId = 123)

```typescript
export default function ChatPage() {
  // Route params
  const conversationIdParam = params.conversationId as string[] | undefined;
  const conversationId = conversationIdParam?.[0] ? parseInt(conversationIdParam[0], 10) : null;

  // Core chat hook - all messaging logic
  const {
    messages, input, setInput, isLoading,
    streamingMessage, streamingMarketplaceData, streamingRealEstateData,
    streamingVignetteData, streamingClothesSearchData, streamingVignetteCategory,
    currentStatus, showStreamingIndicator,
    messagesEndRef, messagesContainerRef, disableAutoScrollRef,
    handleSend, handleFlashcardClick, handleScroll, clearMessages,
  } = useChatConversation({ conversationId, selectedModel });

  // Conditional rendering
  const isWelcomeScreen = !conversationId;

  return (
    <>
      <ChatHeader ... />
      {isWelcomeScreen ? (
        <WelcomeScreen ... />   // Vignette grid + greeting
      ) : (
        <ConversationView ... /> // Messages + streaming + input
      )}
    </>
  );
}
```

### Chat Layout (`src/app/chat/layout.tsx`)

Wraps all `/chat/*` pages with:

```
┌──────────────────────────────────────────────────┐
│ SidebarProvider                                    │
│ ┌──────────┬─────────────────────────────────────┐ │
│ │ Sidebar  │  Main Content Area                  │ │
│ │ (aside)  │                                     │ │
│ │          │  ┌─Menu Button (mobile)             │ │
│ │ - New    │  │                                  │ │
│ │   Chat   │  │  {children}                      │ │
│ │ - Conv.  │  │  (ChatPage)                      │ │
│ │   List   │  │                                  │ │
│ │ - Invest │  │                                  │ │
│ │   Cats.  │  │                                  │ │
│ │ - User   │  │                                  │ │
│ │   Panel  │  └──────────────────────────────────│ │
│ └──────────┴─────────────────────────────────────┘ │
│ SelectionContextMenu (floating)                    │
└──────────────────────────────────────────────────┘
```

**Sidebar contents:**
1. "New Chat" button → navigates to `/chat`
2. Collapsible "Conversations" section → conversation history
3. Investment category buttons (10 categories + 3 special)
4. User profile dropdown with sign-out

**Communication patterns:**
- `refreshConversations` custom event → triggers sidebar to reload conversation list
- `closeSidebar` custom event → closes sidebar on mobile

---

## 5. Data Flow Patterns

### Pattern 1: Chat Message Flow

```
User types message
       │
       ▼
ChatInput.handleSend()
       │
       ▼
useChatConversation.handleSend()
       │
       ├─ If no conversationId:
       │    1. Create conversation via POST /api/conversations
       │    2. Store message in sessionStorage as "pendingChatMessage"
       │    3. Redirect to /chat/[newId]
       │    4. On mount, hook picks up pending message
       │
       └─ If has conversationId:
            1. POST /api/conversations/[id]/messages (SSE)
            2. Read stream events: chunk, marketplace_data, real_estate_data,
               vignette_data, clothes_data, artist_info, status, done
            3. StreamingBubble renders live content
            4. On "done": reload from DB, clear streaming state
```

### Pattern 2: Vignette/Markdown Flow

```
User clicks vignette or flashcard
       │
       ▼
ChatPage.handleVignetteClick()
       │
       1. Create conversation via POST /api/conversations
       2. Store stream config in sessionStorage as "pendingVignetteStream"
       3. Redirect to /chat/[newId]
       │
       ▼
useChatConversation (on mount)
       │
       1. Picks up "pendingVignetteStream" from sessionStorage
       2. Calls GET /api/markdown?image_name=...&category=... (SSE)
       3. Events: document, questions_chunk, status, done
       4. On "done": save content via POST /api/conversations/[id]/vignette-content
```

### Pattern 3: SessionStorage Bridge

Cross-navigation persistence uses `sessionStorage` keys:

| Key | Type | Purpose |
|-----|------|---------|
| `pendingChatMessage` | `string` (JSON) | User message waiting for conversation creation |
| `pendingVignetteStream` | `string` (JSON) | Vignette stream config after redirect |
| `pendingMarkdownStream` | `string` (JSON) | Markdown stream config after redirect |
| `pendingScrollToTop` | `"true"` | Restore scroll position |
| `pendingScrollToTopVignette` | `"true"` | Scroll to top for vignette |
| `disableAutoScroll` | `"true"` | Prevent auto-scroll on vignette navigation |

**Why sessionStorage?** The app creates conversations before sending messages, requiring a redirect to `/chat/[id]`. The pending data survives the navigation in sessionStorage and is consumed on mount.

### Pattern 4: Custom Event Bus

Components communicate via `window` custom events:

| Event | Dispatched By | Handled By | Purpose |
|-------|--------------|------------|---------|
| `refreshConversations` | ChatPage | ChatLayout | Reload sidebar conversation list |
| `closeSidebar` | ChatPage | ChatLayout | Close mobile sidebar |
| `triggerDeepSearch` | SelectionContextMenu | ChatPage | Trigger deep search on selected text |
| `triggerChatButton` | SelectionContextMenu | ChatPage | Send selected text as chat message |

---

## 6. State Management

**No global state library** (no Redux, Zustand, etc.). State is managed through:

### React Hooks + Context

| Context | Provider | Purpose |
|---------|----------|---------|
| `SessionProvider` | next-auth | Authentication session |
| `ThemeProvider` | next-themes | Dark/light mode |
| `I18nProvider` | Custom | Language + translations |
| `SidebarProvider` | Custom | Sidebar open/close + mobile detection |

### Core State in `useChatConversation` Hook

```typescript
// Message state
const [messages, setMessages] = useState<Message[]>([]);
const [streamingMessage, setStreamingMessage] = useState("");
const [streamingMarketplaceData, setStreamingMarketplaceData] = useState<MarketplaceData | null>(null);
const [streamingRealEstateData, setStreamingRealEstateData] = useState<RealEstateData | null>(null);
const [streamingVignetteData, setStreamingVignetteData] = useState<VignetteData | null>(null);
const [streamingClothesSearchData, setStreamingClothesSearchData] = useState(null);
const [streamingVignetteCategory, setStreamingVignetteCategory] = useState<string | null>(null);

// UI state
const [isLoading, setIsLoading] = useState(false);
const [currentStatus, setCurrentStatus] = useState<string | null>(null);
const [showStreamingIndicator, setShowStreamingIndicator] = useState(false);
const [input, setInput] = useState("");
```

### Local State in ChatPage

```typescript
const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_NON_ADMIN_MODEL);
const [selectedAgent, setSelectedAgent] = useState<AgentType>("discover");
const [vignettes, setVignettes] = useState<VignetteData[]>([]);
const [profileUsername, setProfileUsername] = useState<string | null>(null);
```

---

## 7. Theming & Design System

### CSS Variable Theming (`src/app/globals.css`)

Two themes via CSS variables on `:root` and `.dark`:

```css
:root {
  --background: 48 29% 97%;     /* #f9f8f4 - warm beige */
  --foreground: 240 10% 3.9%;   /* Near black */
  --card: 32 43% 94%;           /* Light beige card */
  --primary: 240 5.9% 10%;      /* Dark primary */
  /* ... */
}

.dark {
  --background: 240 10% 3.9%;   /* Near black */
  --foreground: 0 0% 98%;       /* Near white */
  --card: 240 10% 3.9%;         /* Dark card */
  --primary: 0 0% 98%;          /* Light primary */
  /* ... */
}
```

### Typography System (CSS classes)

| Class | Font | Size | Use Case |
|-------|------|------|----------|
| `.md-display-large` | EB Garamond | 32px | Hero headings |
| `.md-display-medium` | EB Garamond | 24px | Section headings |
| `.md-heading-1` | EB Garamond | 28px | Major headings |
| `.md-section-title` | EB Garamond | 18px | Section titles |
| `.md-body` | Inter | 13px | Body text |
| `.md-body-small` | Inter | 11px | Small text |
| `.md-label` | Inter | 9px | Uppercase labels |
| `.md-data-value` | JetBrains Mono | 11px | Data values |
| `.md-data-value-large` | JetBrains Mono | 16px | Large data values |

### Color Palette

| Color | Light Mode | Dark Mode |
|-------|-----------|-----------|
| Background | `rgb(249,248,244)` warm beige | `rgb(1,1,0)` near black |
| Sidebar | `rgb(230,220,210)` darker beige | `#1e1f20` dark gray |
| Accent | `#352ee8` electric blue | `#352ee8` electric blue |

### Layout System

```css
.main-container {
  display: flex;            /* Sidebar + content side by side */
  height: 100dvh;          /* Dynamic Viewport Height (mobile keyboard) */
  overflow: hidden;
}

.chat-history {
  flex: 1;                  /* Takes remaining space */
  overflow-y: auto;
}
```

---

## 8. Deployment & Configuration

### Build Configuration (`next.config.js`)

```javascript
const nextConfig = {
  allowedDevOrigins: ["*.preview.same-app.com"],
  output: "standalone",           // Docker-optimized build
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Supabase storage, Google avatars, Unsplash,
      // art marketplaces, real estate images, CloudFront
      { protocol: "https", hostname: "**" },  // Fallback: all HTTPS
    ],
  },
};
```

### Docker Deployment

Multiple compose files for environments:
- `compose.yml` — Base configuration
- `compose.staging.yml` — Staging overrides
- `compose.preprod.yml` — Pre-production overrides
- `compose.prod.yml` — Production overrides

### Environment Variables

| Variable | Scope | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Supabase public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Supabase admin key |
| `AUTH_SECRET` | Server only | NextAuth encryption secret |
| `GOOGLE_CLIENT_ID` | Server only | Google OAuth client |
| `GOOGLE_CLIENT_SECRET` | Server only | Google OAuth secret |
| `NEXT_PUBLIC_APP_ENV` | Client + Server | Environment (dev/staging/preprod/prod) |
| `NEXT_PUBLIC_SKIP_AUTH` | Client + Server | Bypass auth in dev (`"true"`) |
| `DEV_MODE` | Server only | Enable test pages (`"true"`) |

### Middleware Route Protection (`src/middleware.ts`)

```
Request
  │
  ├─ Dev routes (/markdown, /test-markdown)
  │   └─ DEV_MODE !== "true" → 404
  │
  ├─ NEXT_PUBLIC_SKIP_AUTH === "true" → pass through
  │
  ├─ Not logged in + protected route → /login
  │
  ├─ Logged in + /login
  │   ├─ Restricted env + not admin → /restricted-access
  │   ├─ Unauthorized status → /registration-pending
  │   └─ Otherwise → /
  │
  ├─ Restricted env (staging/preprod) + not admin → /restricted-access
  │
  ├─ Unauthorized status → /registration-pending
  │
  └─ Authorized → pass through
```

**Matcher:** All routes except `/api/*`, `/_next/*`, `/favicon.ico`

**Public routes:** `/login`, `/share/*`, `/test-verification`, `/test_visi`

---

## Cross-References

- API Routes → [docs/02-API_ROUTES.md](./02-API_ROUTES.md)
- Components → [docs/03-COMPONENTS.md](./03-COMPONENTS.md)
- Hooks → [docs/04-HOOKS.md](./04-HOOKS.md)
- Lib/Utilities → [docs/05-LIB_UTILITIES.md](./05-LIB_UTILITIES.md)
- Types → [docs/06-TYPES.md](./06-TYPES.md)
- Auth & Middleware → [docs/07-AUTH_MIDDLEWARE.md](./07-AUTH_MIDDLEWARE.md)
- Contexts & I18n → [docs/08-CONTEXTS_I18N.md](./08-CONTEXTS_I18N.md)
- Streaming Flow → [docs/STREAMING_FLOW.md](./STREAMING_FLOW.md)
