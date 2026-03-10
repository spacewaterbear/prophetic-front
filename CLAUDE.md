# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

**Prophetic Orchestra 7.5** — a luxury investment advisor chatbot. Next.js 15 App Router, TypeScript, Tailwind CSS, shadcn/ui, Supabase, NextAuth v5.

Users interact with AI agents (discover/intelligence/oracle) to get investment advice across luxury asset categories: art, wine, watches, real estate, sneakers, jewelry, cars, whisky, bags, sports cards.

## Development Commands

```bash
npm run dev          # Dev server (Turbopack)
npm run build        # Production build
npm run start        # Production server
npm run lint         # TypeScript + ESLint (npx tsc --noEmit && next lint)
npm run format       # Biome format (npx biome format --write)
```

## Architecture

### Directory Structure

```
src/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Root redirect (→ /chat or /login)
│   ├── layout.tsx                # Root layout (fonts, same-runtime, Providers)
│   ├── providers.tsx             # SessionProvider, ThemeProvider, I18nProvider
│   ├── ClientBody.tsx            # Hydration fix for browser extensions
│   ├── globals.css               # Tailwind + CSS variable theming
│   ├── chat/
│   │   ├── layout.tsx            # Sidebar + conversation list + category nav
│   │   └── [[...conversationId]]/
│   │       └── page.tsx          # Main chat page (orchestrator, ~420 lines)
│   ├── login/page.tsx            # Google OAuth + Magic Link auth
│   ├── registration-pending/     # Unauthorized user holding page
│   ├── restricted-access/        # Admin-only environment gate
│   ├── share/[token]/page.tsx    # Public shared conversation view
│   └── api/                      # API routes (see below)
│
├── components/
│   ├── chat/                     # Chat UI components
│   │   ├── MessageItem.tsx       # Message with PDF export, cards, copy
│   │   ├── ConversationView.tsx  # Message list + input area
│   │   ├── WelcomeScreen.tsx     # Welcome screen with vignettes/greeting
│   │   ├── ChatHeader.tsx        # Header bar (logo, model, theme, share)
│   │   ├── StreamingBubble.tsx   # Streaming AI response display
│   │   └── AIAvatar.tsx          # AI avatar icon
│   ├── chat-input/               # Chat input components
│   │   ├── ChatInput.tsx         # Main input (textarea, toolbar, dropdowns)
│   │   ├── ModeSelector.tsx      # Agent selector (discover/intelligence/oracle)
│   │   ├── FlashcardMenu.tsx     # Flashcard + ranking category picker
│   │   ├── PortfolioMenu.tsx     # Portfolio tier selector
│   │   ├── SettingsMenu.tsx      # Settings panel (market scout, radar)
│   │   ├── CategoryButton.tsx    # Reusable CategoryButton + ModeCard
│   │   ├── MobileBottomSheets.tsx # All mobile bottom sheet portals
│   │   └── index.ts              # Barrel export
│   ├── ui/                       # shadcn/ui (button, card, input, dropdown-menu, chart)
│   ├── Markdown.tsx              # Markdown renderer with table transforms
│   ├── ArtistCard.tsx            # Artist profile card
│   ├── MarketplaceCard.tsx       # Art marketplace results
│   ├── RealEstateCard.tsx        # Real estate listings
│   ├── VignetteGridCard.tsx      # Investment category grid
│   ├── ClothesSearchCard.tsx     # Fashion items search
│   ├── FileUploadPreview.tsx     # Upload progress preview
│   ├── SelectionContextMenu.tsx  # Text selection context menu
│   ├── ModelSelector.tsx         # AI model dropdown (admin only)
│   ├── ThemeToggle.tsx           # Dark/light toggle
│   ├── ShareButton.tsx           # Share conversation
│   ├── TypingIndicator.tsx       # Typing animation
│   └── share/                    # Shared conversation components
│
├── hooks/
│   ├── useChatConversation.ts    # Core chat logic: messages, streaming, SSE, persistence
│   └── useFileUpload.ts          # File upload with validation, retry, progress
│
├── contexts/
│   ├── sidebar-context.tsx       # Sidebar open/close + mobile detection
│   └── i18n-context.tsx          # Internationalization (9 languages, geo-detect)
│
├── types/
│   ├── chat.ts                   # Message, Artist, MarketplaceData, RealEstateData,
│   │                             # PendingMessage, PendingVignetteStream, CATEGORY_DISPLAY_NAMES
│   ├── agents.ts                 # UserStatus, AgentType, getAvailableAgents()
│   ├── vignettes.ts              # Vignettes enum, VignetteData
│   └── next-auth.d.ts            # Session type extensions
│
├── lib/
│   ├── utils.ts                  # cn() for Tailwind class merging
│   ├── models.ts                 # AI model configs (Anthropic, OpenAI, Mistral, etc.)
│   ├── translations.ts           # i18n translations (fr, en, es, de, it, pt, nl, ja, zh)
│   ├── markdown-utils.ts         # HTML transforms (tables, rankings, allocations)
│   ├── constants/
│   │   ├── portfolio-tiers.ts    # DISCOVER/INTELLIGENCE/ORACLE tier data
│   │   └── flashcards.ts         # FLASHCARD_MAPPING (category → API enum)
│   ├── supabase/
│   │   ├── client.ts             # Public Supabase client
│   │   ├── admin.ts              # Service role client (server-only)
│   │   ├── server.ts             # Server-side utilities
│   │   ├── storage.ts            # File upload/download with retry
│   │   ├── profiles.ts           # User profile operations
│   │   └── types.ts              # Auto-generated Supabase DB types
│   └── utils/
│       └── fileValidation.ts     # File type/size validation
│
├── auth.ts                       # NextAuth config (Google + Magic Link providers)
└── middleware.ts                  # Route protection, env-based access control
```

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/conversations` | GET/POST | List/create conversations |
| `/api/conversations/[id]` | GET/PATCH/DELETE | Manage conversation |
| `/api/conversations/[id]/messages` | POST | Send message (SSE streaming) |
| `/api/conversations/[id]/share` | POST/GET | Share conversation link |
| `/api/conversations/[id]/vignette-content` | POST | Save vignette markdown |
| `/api/vignettes` | GET | Fetch investment category vignettes |
| `/api/markdown` | GET | Stream markdown content (SSE) |
| `/api/upload` | POST | File upload |
| `/api/link-preview` | GET | URL metadata |
| `/api/geolocation` | GET | Detect language from location |
| `/api/auth/[...nextauth]` | * | NextAuth handlers |
| `/api/auth/magiclink` | POST | Send magic link email |
| `/api/auth/magiclink/callback` | GET | Magic link verification |

### Key Data Flow

**Chat message flow:**
1. User types in `ChatInput` → `handleSend()` in `useChatConversation`
2. Creates conversation via `/api/conversations` if first message
3. Stores pending message in `sessionStorage`, redirects to `/chat/[id]`
4. On mount, hook picks up pending message, sends to `/api/conversations/[id]/messages`
5. Backend streams SSE events: `chunk`, `marketplace_data`, `real_estate_data`, `vignette_data`, `clothes_data`, `artist_info`, `status`, `done`
6. `StreamingBubble` renders live; on `done`, reloads conversation from DB

**Vignette/markdown flow:**
1. User clicks vignette or flashcard → `streamVignetteMarkdown()` / `streamMarkdown()`
2. Creates conversation, stores `pendingVignetteStream` in sessionStorage
3. After redirect, hook picks up pending stream, calls `/api/markdown` (SSE)
4. Events: `document`, `questions_chunk`, `status`, `done`

**sessionStorage keys** (cross-navigation persistence):
- `pendingChatMessage` — user message waiting for conversation creation
- `pendingVignetteStream` — vignette stream after redirect
- `pendingMarkdownStream` — markdown stream after redirect
- `pendingScrollToTop` — scroll position restoration
- `disableAutoScroll` — prevent scroll on vignette navigation

### Authentication & Authorization

**Providers:** Google OAuth, Magic Link (email)

**User statuses:** `unauthorized` | `free` | `discover` | `intelligence` | `oracle` | `admini`

**Agent access by status:**
- `discover` → discover only
- `intelligence` → discover + intelligence
- `oracle` / `admini` → all three agents

**Middleware gates:**
- Unauthenticated → `/login`
- Unauthorized → `/registration-pending`
- Non-admin on staging/preprod → `/restricted-access`
- Public routes: `/login`, `/share/*`, `/test-verification`, `/test_visi`

### Internationalization

9 languages: fr, en, es, de, it, pt, nl, ja, zh. Auto-detected from geolocation. Managed via `I18nProvider` + `useI18n()` hook. Translation keys in `src/lib/translations.ts`.

## Code Quality

- **TypeScript**: Strict mode. Path alias `@/*` → `./src/*`
- **ESLint**: Next.js config
- **Biome**: Formatter (spaces, double quotes). A11y rules disabled. noUnusedVariables disabled
- **JSX runtime**: `same-runtime/dist` (configured in tsconfig.json — do not change)

## Internationalization (i18n) — MANDATORY RULE

**Every user-facing string must use the i18n system. Never hardcode text in any language.**

- All translations live in `src/lib/translations.ts` — 9 languages: `fr`, `en`, `es`, `de`, `it`, `pt`, `nl`, `ja`, `zh`
- Use `useI18n()` from `@/contexts/i18n-context` in every client component that renders text
- Access strings via `const { t } = useI18n()` then `t("section.key")`
- When adding new text: add the key to **all 9 languages** in `translations.ts`, then use `t("key")` in the component
- The `getTranslation()` function uses dot-notation (e.g. `t("hub.title")`, `t("categoryNav.WINE_0")`)
- If a string is used as an internal lookup key (e.g. `FLASHCARD_MAPPING`), keep the English key for the handler but display `t("flashcardCategories.xxx")` to the user
- Brand/product names (`DISCOVER`, `INTELLIGENCE`, `ORACLE`, `Prophetic Orchestra`) and universal prices (`$29.99 / month`) do not need translation
- Exceptions: `console.error/log`, code comments, `aria-label` on icon-only buttons, URL slugs

## Conventions

- **Imports**: Use `@/` path alias. Barrel exports for `chat-input/`
- **Components**: Client components use `"use client"` directive. Lazy-load heavy components (Markdown, cards)
- **State**: React hooks + contexts. No Redux/Zustand. sessionStorage for cross-navigation persistence
- **Styling**: Tailwind CSS with CSS variables for theming. shadcn/ui "new-york" style, zinc base color
- **Error handling**: `console.error` for actual errors only. No debug `console.log` in committed code
- **Types**: Shared types in `src/types/`. Component-local interfaces in the component file
- **Constants**: Shared constants in `src/lib/constants/`. `CATEGORY_DISPLAY_NAMES` in `src/types/chat.ts`

## Key Shared Types & Utilities

```typescript
// Types
import { Message, MarketplaceData, RealEstateData, CATEGORY_DISPLAY_NAMES } from "@/types/chat";
import { AgentType, UserStatus, getAvailableAgents } from "@/types/agents";
import { VignetteData } from "@/types/vignettes";

// Constants
import { FLASHCARD_MAPPING } from "@/lib/constants/flashcards";
import { DISCOVER_PORTFOLIO_TIERS, INTELLIGENCE_PORTFOLIO_TIERS, ORACLE_PORTFOLIO_TIERS } from "@/lib/constants/portfolio-tiers";

// Hooks
import { useChatConversation } from "@/hooks/useChatConversation";
import { useFileUpload } from "@/hooks/useFileUpload";

// Components
import { ChatInput } from "@/components/chat-input";
import { MessageItem } from "@/components/chat/MessageItem";
```

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin key (server-only) |
| `AUTH_SECRET` | NextAuth secret |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `NEXT_PUBLIC_APP_ENV` | Environment (dev/staging/preprod/prod) |
| `NEXT_PUBLIC_SKIP_AUTH` | Bypass auth in dev (`"true"`) |
| `DEV_MODE` | Enable test pages (`"true"`) |
