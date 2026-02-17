# 04 - Hooks

This document provides a comprehensive reference for the two custom React hooks in `src/hooks/`. The primary hook, `useChatConversation`, is the backbone of the entire chat system (~885 lines). The secondary hook, `useFileUpload`, handles file attachment lifecycle.

---

## Table of Contents

1. [useChatConversation](#usechatconversation)
   - [Signature and Props](#signature-and-props)
   - [State Variables](#state-variables)
   - [Refs](#refs)
   - [SessionStorage Keys](#sessionstorage-keys)
   - [Core Functions](#core-functions)
     - [refreshConversations](#refreshconversations)
     - [loadConversation](#loadconversation)
     - [streamMarkdown](#streammarkdown)
     - [streamVignetteMarkdown](#streamvignettemarkdown)
     - [sendMessageToApi](#sendmessagetoapi)
     - [handleSend](#handlesend)
     - [handleFlashcardClick](#handleflashcardclick)
     - [addAiMessage](#addaimessage)
     - [handleScroll](#handlescroll)
     - [clearMessages](#clearmessages)
   - [Effects](#effects)
     - [Main Initialization Effect](#main-initialization-effect-pending-logic)
     - [Auto-Scroll Effect](#auto-scroll-effect)
     - [Streaming Indicator Effect](#streaming-indicator-effect)
   - [SSE Stream Processing](#sse-stream-processing)
   - [Return Value](#return-value)
2. [useFileUpload](#usefileupload)
   - [Signature and Props](#signature-and-props-1)
   - [Core Functions](#core-functions-1)
   - [Return Value](#return-value-1)

---

## useChatConversation

**File:** `src/hooks/useChatConversation.ts`

This hook manages the entire lifecycle of a chat conversation: loading existing conversations, sending messages, handling SSE streaming responses, processing pending actions stored in `sessionStorage` across navigations, managing scroll behavior, and coordinating multiple streaming data types (marketplace, real estate, vignettes, clothes search).

### Signature and Props

```typescript
interface UseChatConversationProps {
  conversationId: number | null;
  selectedModel?: string;  // default: "anthropic/claude-3.7-sonnet"
}

export function useChatConversation({
  conversationId,
  selectedModel = "anthropic/claude-3.7-sonnet",
}: UseChatConversationProps)
```

- **`conversationId`** -- The current conversation ID from the URL (`/chat/[id]`). `null` when on `/chat` with no conversation selected.
- **`selectedModel`** -- The AI model identifier passed to the API when creating conversations. Defaults to Claude 3.7 Sonnet.

### State Variables

| Variable | Type | Initial Value | Purpose |
|---|---|---|---|
| `messages` | `Message[]` | `[]` | All messages in the current conversation |
| `input` | `string` | `""` | Current text input value from the chat input field |
| `isLoading` | `boolean` | `false` | Whether a message send or stream is in progress |
| `streamingMessage` | `string` | `""` | Accumulated text content from an active SSE stream |
| `streamingMarketplaceData` | `MarketplaceData \| null` | `null` | Marketplace data received during streaming |
| `streamingRealEstateData` | `RealEstateData \| null` | `null` | Real estate data received during streaming |
| `streamingVignetteData` | `VignetteData[] \| null` | `null` | Vignette data received during streaming |
| `streamingClothesSearchData` | `ClothesSearchData \| null` | `null` | Clothes search data received during streaming |
| `streamingVignetteCategory` | `string \| null` | `null` | Category name during vignette/markdown streaming |
| `currentStatus` | `string` | `""` | Status message from backend (e.g., "Searching...", "Analyzing...") |
| `lastStreamingActivity` | `number` | `0` | Timestamp of last SSE chunk received |
| `showStreamingIndicator` | `boolean` | `false` | Whether to show the "still streaming" indicator (gap > 500ms) |
| `lastUserMessageId` | `number \| null` | `null` | ID of the last user message, used for scroll-to-top targeting |
| `shouldScrollToTop` | `boolean` | `false` | Flag to trigger scrolling to the last user message |
| `shouldAutoScroll` | `boolean` | `true` | Whether to auto-scroll to bottom on new content |

### Refs

| Ref | Type | Purpose |
|---|---|---|
| `messagesEndRef` | `RefObject<HTMLDivElement>` | Anchor element at the bottom of the messages list for `scrollIntoView` |
| `messagesContainerRef` | `RefObject<HTMLDivElement>` | The scrollable messages container, used for scroll position calculations |
| `disableAutoScrollRef` | `MutableRefObject<boolean>` | Initialized from `sessionStorage("disableAutoScroll")`. Prevents auto-scroll during vignette navigation |
| `pendingMessageProcessedRef` | `MutableRefObject<boolean>` | Guards against processing the same pending message twice within a conversation |
| `lastProcessedConversationIdRef` | `MutableRefObject<number \| null>` | Tracks which conversation ID was last processed, resets the pending guard on conversation change |

### SessionStorage Keys

These constants define the keys used for cross-navigation state persistence:

```typescript
const PENDING_MESSAGE_KEY = "pendingChatMessage";
const PENDING_VIGNETTE_CONTENT_KEY = "pendingVignetteContent";
const PENDING_MARKDOWN_STREAM_KEY = "pendingMarkdownStream";
const PENDING_SCROLL_TO_TOP_KEY = "pendingScrollToTop";
const PENDING_VIGNETTE_STREAM_KEY = "pendingVignetteStream";
```

Additional keys used inline:
- `"disableAutoScroll"` -- Prevents auto-scroll during vignette/content navigation (set to `"true"`, auto-cleared after 30 seconds)
- `"pendingScrollToTopVignette"` -- Triggers a scroll-to-top for vignette content on mount

**Pattern:** When no `conversationId` exists yet, the hook creates a conversation via `POST /api/conversations`, stores the pending action in `sessionStorage`, then navigates to `/chat/[newId]`. On mount at the new URL, the main effect picks up the pending item and executes it.

### Core Functions

#### refreshConversations

```typescript
const refreshConversations = useCallback(() => {
  window.dispatchEvent(new Event("refreshConversations"));
}, []);
```

Dispatches a custom DOM event `"refreshConversations"` that is listened to by the sidebar/conversation list component. Called after creating a new conversation to update the sidebar.

---

#### loadConversation

```typescript
const loadConversation = useCallback(async (id: number) => {
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
}, [router]);
```

Fetches conversation data from `GET /api/conversations/[id]` and sets messages. On 404 or network error, redirects to home. This is the fallback path in the main effect when no pending actions exist, and is also called after `done` events in `sendMessageToApi` to reload the authoritative state from the database.

---

#### streamMarkdown

```typescript
const streamMarkdown = useCallback(async (
  type: "independant" | "dependant-without-sub" | "dependant-with-sub",
  params: Record<string, string>,
  options?: { userPrompt?: string; scrollToTop?: boolean },
): Promise<boolean> => { ... }, [conversationId, selectedModel, router, refreshConversations]);
```

Streams markdown content from `GET /api/markdown` via SSE. This is used for vignettes, flashcards, rankings, and portfolio content.

**If no `conversationId` exists:**

1. Creates a new conversation via `POST /api/conversations`
2. Stores a `PendingMarkdownStream` object in `sessionStorage` under `PENDING_MARKDOWN_STREAM_KEY`
3. Calls `refreshConversations()` and navigates to `/chat/[newId]`
4. Returns `true` on success

```typescript
const pendingStream: PendingMarkdownStream = {
  type,
  params,
  options,
};
sessionStorage.setItem(PENDING_MARKDOWN_STREAM_KEY, JSON.stringify(pendingStream));
```

**If `conversationId` exists:**

1. Sets loading state, resets streaming state
2. Sets `streamingVignetteCategory` from `params.category || params.sub_category`
3. If `options.userPrompt` is provided, adds a synthetic user message to `messages`
4. If `options.scrollToTop`, sets scroll-to-top state and disables auto-scroll
5. Fetches `GET /api/markdown?type=...&param1=...&param2=...`
6. Processes the response (see [SSE Stream Processing -- Markdown](#sse-stream-processing))

**SSE event types for markdown streams:**

| Event Type | Handling |
|---|---|
| `document` | Sets `streamingMessage` to `parsed.content` |
| `status` | Sets `currentStatus` to `parsed.message` |
| `questions_chunk` | Appends to questions content, displays combined `document + questions` |
| `done` | Combines document + questions, creates final `Message`, saves to DB via `POST /api/conversations/[id]/vignette-content`, clears streaming state |

**Non-SSE fallback:** If `content-type` is not `text/event-stream`, parses as JSON and extracts `text` or `content` field.

---

#### streamVignetteMarkdown

```typescript
const streamVignetteMarkdown = useCallback(async (
  imageName: string,
  category?: string,
  tier?: string,
): Promise<boolean> => { ... }, [streamMarkdown]);
```

A convenience wrapper around `streamMarkdown` for vignette content:

- If `category === "CASH_FLOW_LEASING"`: calls `streamMarkdown("dependant-without-sub", { category: "CASH_FLOW_LEASING", markdown_name: imageName, tiers_level: tier || "DISCOVER" })`
- Otherwise: calls `streamMarkdown("independant", { root_folder: "VIGNETTES", markdown_name: imageName, category: category || "" })`

---

#### sendMessageToApi

```typescript
const sendMessageToApi = useCallback(async (
  targetConversationId: number,
  userInput: string,
  flashCards?: string,
  flashCardType?: "flash_invest" | "ranking" | "portfolio" | "PORTFOLIO",
  scrollToTop: boolean = true,
) => { ... }, [loadConversation]);
```

Sends a user message to the backend and processes the SSE response stream. This is the core chat message sending function.

**Execution flow:**

1. **Reset state:** Sets `isLoading = true`, clears all streaming data, resets status, records `lastStreamingActivity`
2. **Add user message:** Creates a temporary `Message` with `id: Date.now()` and appends it to `messages`
3. **Scroll setup:** If `scrollToTop`, sets `lastUserMessageId` and `shouldScrollToTop`, disables auto-scroll via both ref and `sessionStorage`
4. **API call:** `POST /api/conversations/[id]/messages` with body:
   ```json
   {
     "content": "user input text",
     "flash_cards": "optional flash card value",
     "flash_card_type": "flash_invest | ranking | portfolio | PORTFOLIO"
   }
   ```
5. **Stream processing:** Reads the response body as an SSE stream (see [SSE Stream Processing -- Chat](#sse-stream-processing))
6. **Cleanup:** Sets `isLoading = false` in `finally` block

**SSE event types for chat streams:**

| Event Type | Handling |
|---|---|
| `chunk` | Appends `data.content` to `streamContent`, updates `streamingMessage`, records activity timestamp, clears status |
| `marketplace_data` | Parses `data.data` (handles double-encoded JSON strings), sets `streamingMarketplaceData` |
| `real_estate_data` | Sets `streamingRealEstateData` from `data.data` |
| `vignette_data` | Sets `streamingVignetteData` from `data.data` |
| `clothes_data` | Sets `streamingClothesSearchData` from `data.data` (only if `data.data.listings` exists) |
| `done` | Reloads conversation from DB via `loadConversation(targetConversationId)`, clears all streaming state |
| `artist_info` (with `userMessage` or `aiMessage`) | Same as `done` -- reloads conversation from DB and clears streaming state |
| `status` | Sets `currentStatus` to `data.message`, records activity timestamp |

**Error handling:** Catches errors from both the fetch call and SSE parsing. Parse errors for individual events are logged but do not stop processing. Top-level errors are logged and the loading state is always cleared in `finally`.

---

#### handleSend

```typescript
const handleSend = async (
  messageToSend?: string,
  flashCards?: string,
  flashCardType?: "flash_invest" | "ranking" | "portfolio" | "PORTFOLIO",
  scrollToTop: boolean = true,
) => { ... };
```

The primary entry point called by the chat input component. Orchestrates the full send flow:

**If `conversationId` exists:**
- Delegates directly to `sendMessageToApi`

**If no `conversationId` (new conversation):**

1. Sets `isLoading = true`
2. Creates a temporary user message with `id: Date.now()` and adds it to `messages`
3. If `scrollToTop`, stores `PENDING_SCROLL_TO_TOP_KEY` in `sessionStorage`
4. Creates a new conversation via `POST /api/conversations` with a title derived from the first 50 characters of input
5. Stores the full message payload in `sessionStorage` under `PENDING_MESSAGE_KEY`:
   ```typescript
   sessionStorage.setItem(PENDING_MESSAGE_KEY, JSON.stringify({
     content: userInput,
     flashCards,
     flashCardType,
     scrollToTop,
   }));
   ```
6. Calls `refreshConversations()` and navigates to `/chat/[newConversationId]`

**Guard:** Returns early if input is empty (after trimming) or `isLoading` is already `true`.

---

#### handleFlashcardClick

```typescript
const handleFlashcardClick = (
  flashCards: string,
  question: string,
  flashCardType: "flash_invest" | "ranking" | "portfolio" | "PORTFOLIO",
  displayName: string,
  tier: string = "DISCOVER",
) => { ... };
```

Routes flashcard/ranking/portfolio clicks to the appropriate `streamMarkdown` call:

- **`flash_invest` or `ranking`:** Calls `streamMarkdown("dependant-with-sub", { category: "RANKING", sub_category: flashCards.toUpperCase(), tiers_level: tierUpper }, { userPrompt: displayName, scrollToTop: true })`
- **`portfolio` or `PORTFOLIO`:** Calls `streamMarkdown("dependant-without-sub", { category: "PORTFOLIO", markdown_name: flashCards, tiers_level: tierUpper }, { userPrompt: displayName, scrollToTop: true })`. If `flashCards` is empty/falsy, omits the `markdown_name` param.

---

#### addAiMessage

```typescript
const addAiMessage = async (content: string) => { ... };
```

Programmatically adds an AI message to the conversation. Used for injecting content (e.g., from vignette clicks on the welcome screen).

- **If `conversationId` exists** (or `NEXT_PUBLIC_SKIP_AUTH === "true"`): Directly appends the message to state.
- **If no `conversationId`:** Creates a new conversation, stores the content in `sessionStorage` under `PENDING_VIGNETTE_CONTENT_KEY` as `JSON.stringify({ text: content })`, then navigates to the new conversation.

---

#### handleScroll

```typescript
handleScroll: () => {
  const container = messagesContainerRef.current;
  if (container)
    setShouldAutoScroll(
      container.scrollHeight - container.scrollTop - container.clientHeight < 20,
    );
},
```

Inline function returned from the hook. Should be attached as an `onScroll` handler on the messages container. Sets `shouldAutoScroll` to `true` when the user is within 20px of the bottom, `false` otherwise. This allows the user to scroll up to read history without being pulled back down by new streaming content.

---

#### clearMessages

```typescript
clearMessages: useCallback(() => {
  setMessages([]);
  setStreamingMessage("");
  setStreamingMarketplaceData(null);
  setStreamingRealEstateData(null);
  setStreamingVignetteData(null);
  setStreamingClothesSearchData(null);
  setStreamingVignetteCategory(null);
  setCurrentStatus("");
  setShowStreamingIndicator(false);
}, []),
```

Resets all message and streaming state to initial values. Used when navigating away from a conversation.

---

### Effects

#### Main Initialization Effect (Pending Logic)

**Dependencies:** `[conversationId, loadConversation, sendMessageToApi, streamVignetteMarkdown]`

This is the most critical effect in the application. It runs on every conversation change and processes pending actions stored in `sessionStorage`.

**When `conversationId` is truthy:**

The effect checks for pending items in a strict priority order. Once one is found, it is consumed (removed from `sessionStorage`) and executed. The `pendingMessageProcessedRef` guard prevents re-processing.

```
Priority 1: PENDING_VIGNETTE_STREAM_KEY  --> streamVignetteMarkdown(imageName, category, tier)
Priority 2: PENDING_MARKDOWN_STREAM_KEY  --> streamMarkdown(type, params, options)
Priority 3: PENDING_MESSAGE_KEY          --> sendMessageToApi(conversationId, content, flashCards, flashCardType, scrollToTop)
Priority 4: PENDING_VIGNETTE_CONTENT_KEY --> Parse content, set messages, save to DB via POST /api/conversations/[id]/vignette-content
Fallback:   loadConversation(conversationId)
```

**Priority 4 detail (Pending Vignette Content):**

```typescript
const parsed = JSON.parse(pendingVignetteContent);
if (parsed.text) {
  const messagesToSave = [
    { content: parsed.text, vignetteCategory: parsed.vignetteCategory },
  ];
  if (parsed.questions)
    messagesToSave.push({ content: parsed.questions, vignetteCategory: parsed.vignetteCategory });
  setMessages(messagesToSave.map((m, i) => ({
    id: Date.now() + i,
    content: m.content,
    sender: "ai" as const,
    created_at: new Date().toISOString(),
  })));
  saveVignetteMessages(messagesToSave);
}
```

If the stored content is a plain string (not JSON with a `text` property), it is treated as raw markdown content and saved as a single AI message.

**When `conversationId` is null:**

Clears messages and resets the pending processing guards:

```typescript
setMessages([]);
pendingMessageProcessedRef.current = false;
lastProcessedConversationIdRef.current = null;
```

**Post-pending scroll handling (runs regardless of pending path):**

1. Checks `sessionStorage("disableAutoScroll")` and sets `disableAutoScrollRef.current = true` if found. Schedules cleanup after 30 seconds.
2. Checks `PENDING_SCROLL_TO_TOP_KEY` and sets `shouldScrollToTop = true` if found.
3. Checks `"pendingScrollToTopVignette"` and performs an immediate smooth scroll to top if found.

---

#### Auto-Scroll Effect

**Dependencies:** `[messages, streamingMessage, streamingMarketplaceData, streamingRealEstateData, streamingVignetteData, streamingClothesSearchData, isLoading, shouldAutoScroll, shouldScrollToTop, lastUserMessageId]`

Handles two distinct scroll behaviors:

**Scroll-to-user-message (scroll-to-top):**

When `shouldScrollToTop` and `lastUserMessageId` are set:

```typescript
const element = container.querySelector(
  `[data-message-id="${lastUserMessageId}"]`,
) as HTMLElement;
if (element) {
  container.scrollTo({ top: element.offsetTop, behavior: "smooth" });
  const interval = setInterval(() => {
    container.scrollTo({ top: element.offsetTop, behavior: "smooth" });
  }, 400);
  setTimeout(() => {
    clearInterval(interval);
    setShouldScrollToTop(false);
  }, 2000);
}
```

This repeatedly scrolls to the user message element every 400ms for 2 seconds. The repetition compensates for content height changes as the AI response streams in below.

**Auto-scroll to bottom:**

When `shouldAutoScroll` is true, the last message has no vignette data, and auto-scroll is not disabled:

```typescript
messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
```

---

#### Streaming Indicator Effect

**Dependencies:** `[isLoading, streamingMessage, lastStreamingActivity]`

Shows a "still thinking" indicator when the AI is streaming but there has been a gap of more than 500ms since the last chunk:

```typescript
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
```

Polls every 300ms. The indicator is only shown when: loading is active, there is already some streaming content, and the last chunk arrived more than 500ms ago. Cleared immediately when `isLoading` becomes false.

---

### SSE Stream Processing

Both `streamMarkdown` and `sendMessageToApi` follow the same SSE parsing pattern:

```typescript
const reader = response.body?.getReader();
const decoder = new TextDecoder();
let buffer = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });
  const events = buffer.split("\n\n");
  buffer = events.pop() || "";  // Keep incomplete event in buffer

  for (const event of events) {
    if (!event.trim()) continue;
    // Reconstruct multi-line data fields
    let eventData = "";
    for (const line of event.split("\n")) {
      if (line.startsWith("data: ")) eventData += line.slice(6);
    }
    if (!eventData || eventData === "[DONE]") continue;

    const parsed = JSON.parse(eventData);
    // Handle parsed.type ...
  }
}
```

**Key details:**
- Uses `ReadableStream` with `getReader()` for incremental SSE parsing
- Handles multi-line `data:` fields by concatenating all `data:` lines within a single event
- Events are delimited by `\n\n` (standard SSE format)
- The last incomplete chunk is kept in a buffer across read iterations
- `[DONE]` sentinel is explicitly ignored
- Parse errors for individual events are caught and logged without stopping the stream

---

### Return Value

```typescript
return {
  // State
  messages,                    // Message[] - all conversation messages
  input,                       // string - current input field value
  setInput,                    // Dispatch<SetStateAction<string>>
  isLoading,                   // boolean - whether a request is in flight
  streamingMessage,            // string - accumulated streaming text
  streamingMarketplaceData,    // MarketplaceData | null
  streamingRealEstateData,     // RealEstateData | null
  streamingVignetteData,       // VignetteData[] | null
  streamingClothesSearchData,  // ClothesSearchData | null
  streamingVignetteCategory,   // string | null
  currentStatus,               // string - backend status message
  showStreamingIndicator,      // boolean - show "still thinking" indicator

  // Refs (for DOM attachment)
  messagesEndRef,              // RefObject<HTMLDivElement>
  messagesContainerRef,        // RefObject<HTMLDivElement>
  disableAutoScrollRef,        // MutableRefObject<boolean>

  // Scroll state
  lastUserMessageId,           // number | null
  shouldScrollToTop,           // boolean
  setShouldScrollToTop,        // Dispatch<SetStateAction<boolean>>

  // Handlers
  handleSend,                  // (messageToSend?, flashCards?, flashCardType?, scrollToTop?) => Promise<void>
  handleFlashcardClick,        // (flashCards, question, flashCardType, displayName, tier?) => void
  handleScroll,                // () => void - attach to container onScroll
  addAiMessage,                // (content: string) => Promise<void>
  streamVignetteMarkdown,      // (imageName, category?, tier?) => Promise<boolean>
  streamMarkdown,              // (type, params, options?) => Promise<boolean>
  clearMessages,               // () => void
};
```

---

## useFileUpload

**File:** `src/hooks/useFileUpload.ts`

Manages file upload lifecycle: validation, upload with retry, progress tracking, error handling, and deletion. State for the attached files list is owned by the parent component and updated via the `onFilesChange` callback.

### Signature and Props

```typescript
interface UseFileUploadProps {
  userId?: string;
  conversationId?: number | null;
  attachedFiles: AttachedFile[];
  onFilesChange?: (files: AttachedFile[]) => void;
}

export function useFileUpload({
  userId,
  conversationId,
  attachedFiles,
  onFilesChange,
}: UseFileUploadProps)
```

- **`userId`** -- The authenticated user's ID, required for upload path construction. If absent, uploads are rejected with a toast error.
- **`conversationId`** -- Optional conversation ID, passed to `uploadWithRetry` for file organization in storage.
- **`attachedFiles`** -- The current list of attached files (state owned by the parent). Uses the `AttachedFile` interface:

```typescript
// From src/components/FileUploadPreview.tsx
interface AttachedFile {
  id: string;                                            // Unique ID: `${Date.now()}-${random}`
  file: File;                                            // Original File object
  name: string;                                          // file.name
  size: number;                                          // file.size
  type: string;                                          // file.type (MIME)
  uploadStatus: 'pending' | 'uploading' | 'completed' | 'error';
  uploadProgress: number;                                // 0-100
  url?: string;                                          // Supabase public URL after upload
  path?: string;                                         // Supabase storage path after upload
  error?: string;                                        // Error message if upload failed
}
```

- **`onFilesChange`** -- Callback to update the parent's file list state. Called on every status change (new file, progress update, completion, error, removal).

### Refs

| Ref | Type | Purpose |
|---|---|---|
| `fileInputRef` | `RefObject<HTMLInputElement>` | Reference to the hidden `<input type="file">` element, used to reset its value after selection |

### Core Functions

#### processFiles

```typescript
const processFiles = async (files: File[]) => { ... };
```

Processes an array of `File` objects (from input or drag-and-drop):

1. **Auth guard:** If `userId` is falsy, shows `toast.error("Please log in to upload files")` and returns.
2. **Per-file loop:** For each file:
   - **Validation:** Calls `validateFile(file)` from `@/lib/utils/fileValidation`. If invalid, shows `toast.error(validation.error)` and skips to the next file.
   - **Create entry:** Generates a unique `fileId` using `Date.now()` + random string. Creates an `AttachedFile` with `uploadStatus: "uploading"` and `uploadProgress: 0`.
   - **Notify parent:** Calls `onFilesChange([...attachedFiles, newFile])`.
   - **Upload:** Calls `uploadWithRetry(file, userId, conversationId || null, 3, progressCallback)` from `@/lib/supabase/storage`. The `3` is the max retry count. The progress callback updates the file's `uploadProgress` via `onFilesChange`.
   - **On success:** Updates the file entry to `uploadStatus: "completed"`, `uploadProgress: 100`, and sets `url` and `path` from the upload result. Shows `toast.success`.
   - **On error:** Updates the file entry to `uploadStatus: "error"` with the error message. Shows `toast.error`.

```typescript
const uploaded = await uploadWithRetry(
  file,
  userId,
  conversationId || null,
  3,  // maxRetries
  (progress) => {
    onFilesChange?.(
      updatedFiles.map((f) =>
        f.id === fileId ? { ...f, uploadProgress: progress } : f,
      ),
    );
  },
);
```

---

#### handleFileSelect

```typescript
const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => { ... };
```

Event handler for `<input type="file" onChange={handleFileSelect}>`. Converts `e.target.files` to an array, delegates to `processFiles`, then resets the file input value so the same file can be re-selected.

---

#### handleRemoveFile

```typescript
const handleRemoveFile = async (fileId: string) => { ... };
```

Removes a file from the attached files list:

1. Finds the file by `fileId` in `attachedFiles`.
2. If the file has a `path` (was successfully uploaded), calls `deleteFile(file.path)` from `@/lib/supabase/storage` to remove it from Supabase storage. Errors are caught and logged but do not prevent removal from the UI.
3. Filters the file out of `attachedFiles` via `onFilesChange`.

---

#### handleRetryUpload

```typescript
const handleRetryUpload = async (fileId: string) => { ... };
```

Retries a failed upload:

1. **Guard:** Returns early if no `userId` or file not found.
2. Resets the file's status to `uploadStatus: "uploading"`, `uploadProgress: 0`, clears `error`.
3. Calls `uploadWithRetry` with the original `file.file` object (the `File` instance is preserved in the `AttachedFile` entry).
4. On success/failure, updates state and shows toast notifications identically to `processFiles`.

---

### Return Value

```typescript
return {
  fileInputRef,         // RefObject<HTMLInputElement> - attach to <input type="file">
  handleFileSelect,     // (e: ChangeEvent<HTMLInputElement>) => Promise<void>
  handleRemoveFile,     // (fileId: string) => Promise<void>
  handleRetryUpload,    // (fileId: string) => Promise<void>
  processFiles,         // (files: File[]) => Promise<void> - for drag-and-drop
};
```

### Error Handling Patterns

- **Validation errors:** Shown to user via `toast.error`, file is skipped.
- **Upload errors:** File entry is updated to `error` status with the error message. `toast.error` is shown. The original `File` object is preserved for retry.
- **Delete errors:** Logged via `console.error` but do not prevent UI removal.
- **Auth errors:** `toast.error("Please log in to upload files")`, no upload attempted.

---

## Cross-Hook Integration

The two hooks work together in the chat input area (`ChatInput.tsx`):

1. `useChatConversation` provides `handleSend` which accepts the user's text message.
2. `useFileUpload` manages file attachments that are displayed via `FileUploadPreview`.
3. The parent component coordinates: files are attached via `useFileUpload`, and when the user sends, the file URLs (from completed uploads) are included in the message content or metadata passed through `handleSend`.

The `useChatConversation` hook does not directly reference `useFileUpload`. File data flows through the component layer that consumes both hooks.
