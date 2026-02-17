# API Routes Documentation

All API routes live in `src/app/api/` and use the Next.js App Router convention. All server-side database access uses the **admin Supabase client** with manual `user_id` filtering for security.

---

## Table of Contents

1. [Conversations CRUD](#1-conversations-crud)
2. [Messages (SSE Streaming)](#2-messages-sse-streaming)
3. [Sharing](#3-sharing)
4. [Vignette Content](#4-vignette-content)
5. [Vignettes](#5-vignettes)
6. [Markdown Proxy (SSE)](#6-markdown-proxy-sse)
7. [File Upload](#7-file-upload)
8. [Link Preview](#8-link-preview)
9. [Geolocation](#9-geolocation)
10. [Authentication](#10-authentication)

---

## 1. Conversations CRUD

### `GET /api/conversations`

**File:** `src/app/api/conversations/route.ts`

Lists the 5 most recent conversations for the authenticated user.

```typescript
// Response
{
  conversations: Array<{
    id: number;
    user_id: string;
    title: string;
    model: string;
    created_at: string;
    updated_at: string;
  }>
}
```

**Key details:**
- Returns max 5 conversations, ordered by `updated_at` DESC then `created_at` DESC
- In dev mode (`NEXT_PUBLIC_SKIP_AUTH=true`), uses `DEV_USER_ID` and auto-creates a dev profile

---

### `POST /api/conversations`

**File:** `src/app/api/conversations/route.ts`

Creates a new conversation.

```typescript
// Request body
{ title?: string; model?: string }

// Response (201)
{
  conversation: {
    id: number;
    user_id: string;
    title: string;      // Defaults to "New Chat"
    model: string;      // Defaults to "anthropic/claude-3.7-sonnet"
    created_at: string;
    updated_at: string;
  }
}
```

---

### `GET /api/conversations/[id]`

**File:** `src/app/api/conversations/[id]/route.ts`

Fetches a conversation with all its messages. Performs **metadata expansion** — transforms raw DB messages into enriched message objects.

```typescript
// Response
{
  conversation: { id, user_id, title, model, ... },
  messages: Array<{
    id: number;
    content: string;
    sender: "user" | "ai";
    created_at: string;
    // Expanded from metadata:
    marketplace_data?: MarketplaceData;
    marketplace_position?: "before" | "after";
    real_estate_data?: RealEstateData;
    clothes_search_data?: ClothesSearchData;
  }>
}
```

**Metadata expansion pipeline (3 passes):**

1. **Structured data expansion** — If `metadata.structured_data` exists, merge its fields into the message object while preserving `content`
2. **Artist info stripping** — Messages with `type: "artist_info"` are converted to regular messages (removes `artist`, `message`, `research_type` fields, keeps `content`)
3. **Data extraction** — Extracts `marketplace_data`, `real_estate_data`, `clothes_search_data` from metadata into top-level message fields. Handles double-encoded JSON strings.

---

### `PATCH /api/conversations/[id]`

**File:** `src/app/api/conversations/[id]/route.ts`

Updates conversation title and/or model.

```typescript
// Request body
{ title?: string; model?: string }

// Response
{ conversation: { ... } }
```

---

### `DELETE /api/conversations/[id]`

**File:** `src/app/api/conversations/[id]/route.ts`

Deletes a conversation and all its messages. First verifies ownership, then deletes messages, then deletes the conversation.

```typescript
// Response (200)
{ success: true }
```

---

## 2. Messages (SSE Streaming)

### `POST /api/conversations/[id]/messages`

**File:** `src/app/api/conversations/[id]/messages/route.ts` (~893 lines)

The main messaging endpoint. Sends a user message, calls the Prophetic API, and streams the AI response back via Server-Sent Events.

```typescript
// Request body
{
  content: string;              // User message text
  agent_type?: string;          // "discover" | "intelligence" | "oracle"
  attachments?: Array<{         // File attachments
    name: string;
    url: string;
    type: string;
    size: number;
    path: string;
  }>;
  flash_cards?: string;         // Flashcard category
  flash_card_question?: string; // Override question for flashcards
  flash_card_type?: string;     // "flash_invest" | "ranking"
}
```

### SSE Event Types

| Event Type | Payload | Description |
|-----------|---------|-------------|
| `chunk` | `{ type: "chunk", content: string }` | Text content fragment |
| `marketplace_data` | `{ type: "marketplace_data", data: MarketplaceData }` | Art marketplace results |
| `real_estate_data` | `{ type: "real_estate_data", data: RealEstateData }` | Real estate listings |
| `vignette_data` | `{ type: "vignette_data", data: VignetteData }` | Investment vignette data |
| `clothes_data` | `{ type: "clothes_data", data: ClothesSearchData }` | Fashion search results |
| `artist_info` | `{ type: "artist_info", data: ArtistData }` | Artist profile card data |
| `metadata` | `{ type: "metadata", skip_streaming?: bool, intro?: string }` | Intro text / metadata |
| `status` | `{ type: "status", message: string }` | Status update (e.g., "Searching...") |
| `error` | `{ type: "error", error: string }` | Error message |
| `done` | `{ type: "done", userMessage: {...}, aiMessage: {...} }` | Stream complete |
| `artist_info` (done) | `{ type: "artist_info", userMessage: {...}, aiMessage: {...} }` | Artist stream complete |

### Processing Pipeline

```
1. AUTH & VALIDATION
   ├─ Verify session or dev mode
   ├─ Validate conversation ownership
   └─ Parse request body (content, agent_type, attachments, flash_cards)

2. USER MESSAGE STORAGE
   ├─ Insert user message to DB with metadata (attachments, flashcard info)
   └─ Auto-generate conversation title if "New Chat"

3. CONVERSATION HISTORY
   └─ Fetch last 5 messages (excluding current) for context

4. PROPHETIC API CALL
   ├─ POST to /prophetic/langchain_agent/query
   ├─ Headers: Bearer token auth
   └─ Body: { question, model, session_id, user_id, conversation_history,
              tiers_level, attachments, flash_cards, flash_card_type }

5. SSE STREAM PROCESSING (ReadableStream)
   ├─ Buffer management: split by \n\n, keep incomplete events
   ├─ Parse "data: " lines from each event
   ├─ Handle event types:
   │   ├─ artist_info    → capture structuredData, forward to client
   │   ├─ metadata       → forward, accumulate intro text if skip_streaming
   │   ├─ marketplace_data → capture marketplaceData, forward
   │   ├─ real_estate_data → capture realEstateData, forward
   │   ├─ vignette_data  → capture vignetteData, forward
   │   ├─ clothes_data   → capture clothesSearchData, forward
   │   ├─ status         → forward to client
   │   └─ content chunks → handle 3 formats:
   │       ├─ Nested SSE (content starts with "data:") → recursive parse
   │       ├─ Standalone JSON (content starts with "{") → type detection
   │       └─ Plain text → accumulate in fullResponse, send as "chunk"
   └─ Process remaining buffer after stream ends

6. DATABASE STORAGE
   ├─ Build metadata object from all captured data:
   │   ├─ structured_data (artist_info)
   │   ├─ marketplace_data + marketplace_position
   │   ├─ real_estate_data
   │   ├─ vignette_data
   │   └─ clothes_search_data
   └─ Insert AI message: { conversation_id, content: fullResponse, sender: "ai", metadata }

7. COMPLETION SIGNAL
   └─ Send "done" event (or "artist_info" if structured) with DB records
```

### Error Handling

**Maintenance detection:** Checks for keywords like "error generating insight", "credit balance", "rate limit", "anthropic api" and returns friendly message: `"My brain is in maintenance right now, please wait"`

```typescript
function isMaintenanceError(errorText: unknown): boolean {
  const maintenanceKeywords = [
    'error generating insight', 'error code: 400', 'error code: 429',
    'credit balance', 'rate limit', 'anthropic api', ...
  ];
  return maintenanceKeywords.some(keyword => lowerErrorText.includes(keyword));
}
```

---

## 3. Sharing

### `POST /api/conversations/[id]/share`

**File:** `src/app/api/conversations/[id]/share/route.ts`

Creates or returns an existing share link for a conversation.

```typescript
// Response
{
  shareToken: string;     // nanoid(21)
  shareUrl: string;       // e.g., "https://app.com/share/abc123..."
  expiresAt: null;        // No expiration by default
}
```

**Logic:**
1. Verify conversation ownership
2. Check for existing valid share → return if found
3. Generate `nanoid(21)` token
4. Insert into `conversation_shares` table
5. Return share URL using `NEXTAUTH_URL` or request origin

---

## 4. Vignette Content

### `POST /api/conversations/[id]/vignette-content`

**File:** `src/app/api/conversations/[id]/vignette-content/route.ts`

Saves AI-generated vignette content as messages without triggering an AI response.

```typescript
// Request body
{
  messages: Array<{
    content: string;
    vignetteCategory?: string;
  }>
}

// Response
{
  success: true,
  messages: Array<{ id, content, sender: "ai", metadata, ... }>
}
```

All messages are saved as `sender: "ai"` with optional `vignette_category` in metadata.

---

## 5. Vignettes

### `GET /api/vignettes?category=WINE`

**File:** `src/app/api/vignettes/route.ts`

Proxy to Prophetic API for investment category vignettes. Includes **5-minute in-memory cache**.

```typescript
// Response (from Prophetic API)
{
  vignettes: Array<{
    brand_name: string;
    public_url: string;
    category: string;
    // ... other vignette fields
  }>
}
```

**Caching:**
```typescript
const vignetteCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
```

---

## 6. Markdown Proxy (SSE)

### `GET /api/markdown`

**File:** `src/app/api/markdown/route.ts`

Unified proxy for Prophetic Markdown endpoints. Forwards SSE streams or JSON responses.

```typescript
// Query parameters
{
  type: 'independant' | 'dependant-without-sub' | 'dependant-with-sub'; // Required
  tiers_level?: 'DISCOVER' | 'INTELLIGENCE' | 'ORACLE'; // Default: DISCOVER
  category?: string;        // For dependant types
  sub_category?: string;    // For dependant-with-sub
  root_folder?: string;     // For independant: 'ART_TRADING_VALUE' | 'VIGNETTES'
  markdown_name?: string;   // Filename without extension
}
```

**Backend path mapping:**
| Type | Backend Path |
|------|-------------|
| `independant` | `/prophetic/markdown/tiers-independant` |
| `dependant-without-sub` | `/prophetic/markdown/tiers-dependant/without-sub-category` |
| `dependant-with-sub` | `/prophetic/markdown/tiers-dependant/with-sub-category` |

**Response handling:**
- If `Content-Type: text/event-stream` → forwards SSE stream with headers
- Otherwise → forwards JSON/text response

---

## 7. File Upload

### `POST /api/upload`

**File:** `src/app/api/upload/route.ts`

Uploads files to Supabase Storage (`attachement` bucket).

```typescript
// Request: FormData
// - file: File
// - conversationId?: string

// Response
{
  success: true,
  file: {
    name: string;     // Original filename
    size: number;     // Bytes
    type: string;     // MIME type
    url: string;      // Public Supabase URL
    path: string;     // Storage path: {userId}/{conversationId|temp}/{timestamp}_{sanitizedName}
  }
}
```

**Validation:**
- File size max: `MAX_FILE_SIZE` (from `fileValidation.ts`)
- Empty file check
- Filename sanitization: replace non-alphanumeric characters with `_`

### `DELETE /api/upload`

Deletes a file from Supabase Storage. Verifies the path starts with the current user's ID.

```typescript
// Request body
{ path: string }

// Response
{ success: true }
```

---

## 8. Link Preview

### `GET /api/link-preview?url=...`

**File:** `src/app/api/link-preview/route.ts`

Extracts Open Graph metadata from a URL using Cheerio.

```typescript
// Response
{
  title: string;        // og:title | twitter:title | <title> | hostname
  description?: string; // og:description | twitter:description | meta description
  image?: string;       // og:image | twitter:image (made absolute)
  url: string;          // Original URL
  siteName: string;     // og:site_name | hostname
  favicon: string;      // link[rel=icon] | /favicon.ico
}
```

**Features:**
- Browser-like User-Agent header to avoid blocks
- 5-second timeout via `AbortSignal.timeout(5000)`
- Graceful fallback: on error, returns `{ title: hostname, favicon: /favicon.ico }`
- Relative URL resolution for images and favicons

---

## 9. Geolocation

### `GET /api/geolocation`

**File:** `src/app/api/geolocation/route.ts`

Detects language from client IP using ipapi.co.

```typescript
// Response
{
  country: string;     // ISO country code (e.g., "FR")
  language: string;    // Language code (e.g., "fr")
  ip: string;          // Client IP
  source: "default" | "ipapi" | "error_fallback"
}
```

**Country-to-language mapping (30 countries):**
- French: FR, BE, CH, CA
- English: US, GB, AU, NZ, IE
- Spanish: ES, MX, AR, CO, CL, PE
- German: DE, AT
- Italian: IT
- Portuguese: PT, BR
- Dutch: NL
- Japanese: JP
- Chinese: CN, TW, HK

**Defaults:** French (`fr`) for localhost, development, and error fallback.

---

## 10. Authentication

### NextAuth Routes

**File:** `src/app/api/auth/[...nextauth]/route.ts`

Standard NextAuth.js catch-all handler. See [docs/07-AUTH_MIDDLEWARE.md](./07-AUTH_MIDDLEWARE.md) for full auth configuration.

### Magic Link Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/magiclink` | POST | Send magic link email |
| `/api/auth/magiclink/callback` | GET | Verify magic link token |
| `/api/auth/magiclink/check` | GET | Check magic link status |

---

## Common Patterns

### Authentication Pattern

All protected routes follow the same pattern:

```typescript
const session = await auth();
const isDevMode = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";
const userId = session?.user?.id || (isDevMode ? DEV_USER_ID : null);

if (!userId) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

const supabase = createAdminClient();
// Always filter by user_id manually for security
```

### SSE Response Pattern

```typescript
const encoder = new TextEncoder();
const stream = new ReadableStream({
  async start(controller) {
    // ... process events ...
    const chunk = `data: ${JSON.stringify({ type: "...", ... })}\n\n`;
    controller.enqueue(encoder.encode(chunk));
    // ... on completion:
    controller.close();
  }
});

return new Response(stream, {
  headers: {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  },
});
```

### Prophetic API Integration

All Prophetic API calls use:
- Base URL: `process.env.PROPHETIC_API_URL`
- Auth: `Bearer ${process.env.PROPHETIC_API_TOKEN}`
- Content-Type: `application/json`

---

## Cross-References

- Streaming flow details → [docs/STREAMING_FLOW.md](./STREAMING_FLOW.md)
- Message types → [docs/06-TYPES.md](./06-TYPES.md)
- Auth config → [docs/07-AUTH_MIDDLEWARE.md](./07-AUTH_MIDDLEWARE.md)
- Frontend consumption → [docs/04-HOOKS.md](./04-HOOKS.md) (useChatConversation)
