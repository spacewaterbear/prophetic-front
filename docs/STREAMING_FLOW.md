# Message Streaming Flow Documentation

**Prophetic Orchestra 7.5 - Chat Interface**

This document provides a comprehensive explanation of how bot messages are streamed and displayed in the Prophetic Orchestra chat application, from the backend API through to the frontend UI.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Backend Streaming Pipeline](#2-backend-streaming-pipeline)
3. [Frontend Event Handling](#3-frontend-event-handling)
4. [Display Rendering](#4-display-rendering)
5. [Event Sequence Diagram](#5-event-sequence-diagram)
6. [State Management](#6-state-management)
7. [Component Hierarchy](#7-component-hierarchy)
8. [File Reference](#8-file-reference)

---

## 1. Architecture Overview

### High-Level Flow

```
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│  Prophetic API   │ SSE  │  Next.js API     │ SSE  │  React Frontend  │
│  (External)      │─────→│  Route Handler   │─────→│  (Chat UI)       │
└──────────────────┘      └──────────────────┘      └──────────────────┘
                                    │                         │
                                    ↓                         ↓
                          ┌──────────────────┐      ┌──────────────────┐
                          │  Supabase DB     │      │  User Interface  │
                          │  (Messages)      │      │  (Streaming)     │
                          └──────────────────┘      └──────────────────┘
```

### Key Concepts

**Server-Sent Events (SSE)**: Unidirectional event stream from server to client over HTTP. Events are sent as text with `data:` prefix and separated by `\n\n`.

**Streaming State vs Saved State**:
- **Streaming State**: Temporary React state (`streamingMessage`, `streamingMarketplaceData`) that displays content as it arrives in real-time
- **Saved State**: Persistent messages stored in Supabase database, loaded into `messages` array after streaming completes

**Transition Flow**: Messages start as streaming state, get saved to database during streaming, then transition to saved state after completion.

---

## 2. Backend Streaming Pipeline

### Location
`src/app/api/conversations/[id]/messages/route.ts` (lines 100-412)

### A. Request Processing

**1. User Message Storage** (lines 116-134)

```typescript
// Save user message to database
const { data: userMessage, error: userMessageError } = await supabase
  .from("messages")
  .insert({
    conversation_id: conversationId,
    content: content,
    sender: "user",
  })
  .select()
  .single();
```

**2. Conversation History Building** (lines 135-148)

```typescript
// Fetch last 5 messages for context
const { data: historyMessages } = await supabase
  .from("messages")
  .select("*")
  .eq("conversation_id", conversationId)
  .order("created_at", { ascending: false })
  .limit(5);

// Build conversation history array
const conversationHistory = historyMessages?.reverse().map(msg => ({
  role: msg.sender === "user" ? "user" : "assistant",
  content: msg.content
})) || [];
```

**3. Prophetic API Request** (lines 149-163)

```typescript
const propheticResponse = await fetch(`${PROPHETIC_API_URL}/generate_with_tools`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    question: content,
    model: modelToUse,
    session_id: conversationId.toString(),
    user_id: conversation.user_id,
    conversation_history: conversationHistory
  }),
});
```

### B. SSE Stream Processing

**Event Buffer Management** (lines 147-168)

```typescript
const decoder = new TextDecoder();
let buffer = "";

for await (const chunk of propheticResponse.body) {
  const text = decoder.decode(chunk, { stream: true });
  buffer += text;

  // Split by SSE delimiters (\n\n)
  const events = buffer.split("\n\n");
  buffer = events.pop() || ""; // Keep incomplete event in buffer

  for (const event of events) {
    if (!event.trim()) continue;
    // Process complete events...
  }
}
```

**Event Type Handling**

| Event Type | Lines | Processing | Forwarded to Client |
|------------|-------|------------|---------------------|
| **marketplace_data** | 224-236 | Captured in `marketplaceData` variable | ✅ Immediate |
| **metadata** | 210-221 | If `skip_streaming=true`, adds intro to `fullResponse` | ✅ Immediate |
| **artist_info** | 196-207 | Captured in `structuredData` variable | ✅ Immediate |
| **chunk** | 239-306 | Accumulated in `fullResponse` | ✅ Immediate |
| **error** | 309-316 | Logged and forwarded | ✅ Immediate |
| **nested SSE** | 244-289 | Detected by `data:` prefix, recursively parsed | ✅ After parsing |

**Example: marketplace_data Event** (lines 224-236)

```typescript
if (parsed.type && parsed.type === "marketplace_data") {
  console.log("[Prophetic API] Received marketplace_data");

  // Capture for database storage
  marketplaceData = parsed;

  // Forward to client immediately
  const marketplaceChunk = `data: ${JSON.stringify({
    type: "marketplace_data",
    data: parsed.data
  })}\n\n`;
  controller.enqueue(encoder.encode(marketplaceChunk));
  continue;
}
```

**Example: chunk Event** (lines 297-305)

```typescript
// Normal text content - add to response and send to client
fullResponse += content;

// Send chunk to client (SSE format)
const chunkData = `data: ${JSON.stringify({
  type: "chunk",
  content: content
})}\n\n`;
controller.enqueue(encoder.encode(chunkData));
```

### C. Database Storage

**After streaming completes** (lines 324-378)

**1. Construct Metadata** (lines 327-357)

```typescript
let messageMetadata: any = null;

// If we captured structured data (e.g., artist_info)
if (structuredData && structuredData.type) {
  messageMetadata = {
    type: structuredData.type,
    structured_data: structuredData
  };
}

// If we captured marketplace data, add it to metadata
if (marketplaceData && marketplaceData.type === "marketplace_data") {
  if (messageMetadata) {
    // Combine with existing metadata
    messageMetadata.marketplace_data = marketplaceData.data;
    messageMetadata.marketplace_position = marketplaceData.marketplace_position || "before";
  } else {
    // Create new metadata
    messageMetadata = {
      type: "marketplace_data",
      structured_data: marketplaceData,
      marketplace_data: marketplaceData.data,
      marketplace_position: marketplaceData.marketplace_position || "before"
    };
  }
}
```

**2. Save to Database** (lines 369-378)

```typescript
const { data: aiMessage, error: aiMessageError } = await supabase
  .from("messages")
  .insert({
    conversation_id: conversationId,
    content: messageContent,  // Accumulated fullResponse
    sender: "ai",
    metadata: messageMetadata,  // Contains marketplace_data if present
  })
  .select()
  .single();
```

### D. Completion Signal

**Send final event** (lines 404-410)

```typescript
const doneChunk = `data: ${JSON.stringify({
  type: messageMetadata?.type === "artist_info" ? "artist_info" : "done",
  userMessage,   // Database record
  aiMessage      // Database record with metadata
})}\n\n`;
controller.enqueue(encoder.encode(doneChunk));
```

---

## 3. Frontend Event Handling

### Location
`src/app/page.tsx` (lines 503-649)

### A. SSE Stream Reading

**Initialize Reader** (lines 503-518)

```typescript
const reader = response.body?.getReader();
const decoder = new TextDecoder();

if (!reader) {
  throw new Error("No response stream");
}

let streamContent = "";

while (true) {
  const { done, value } = await reader.read();

  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split("\n").filter(line => line.trim());
```

**Parse SSE Format** (lines 520-528)

```typescript
for (const line of lines) {
  // Strip "data: " prefix if present
  let cleanedLine = line;
  if (line.startsWith("data: ")) {
    cleanedLine = line.slice(6); // Remove "data: "
  }

  try {
    const data = JSON.parse(cleanedLine);
    console.log("[FRONTEND DEBUG] Received event:", data.type, data);
```

### B. Event Type Processing

#### Event: `chunk`
**Lines**: 531-533

```typescript
if (data.type === "chunk") {
  streamContent += data.content;
  setStreamingMessage(streamContent);
}
```

**State Update**: `streamingMessage` ← accumulated text
**UI Effect**: Text appears character-by-character in streaming bubble

---

#### Event: `marketplace_data`
**Lines**: 596-607

```typescript
if (data.type === "marketplace_data") {
  const marketplaceData = data.data;

  if (!marketplaceData) {
    console.error("[Marketplace Data] Missing nested data, skipping:", data);
    continue;
  }

  console.log("[DEBUG] Processing marketplace_data event", marketplaceData);

  // Set streaming marketplace data to display it immediately
  setStreamingMarketplaceData(marketplaceData);
}
```

**State Update**: `streamingMarketplaceData` ← marketplace data object
**UI Effect**: Marketplace card appears immediately at top of bubble

---

#### Event: `metadata`
**Lines**: 609-616

```typescript
if (data.type === "metadata") {
  // Handle metadata messages (e.g., intro text with skip_streaming flag)
  if (data.skip_streaming && data.intro) {
    // If skip_streaming is true, add the intro text immediately
    streamContent += data.intro + "\n\n";
    setStreamingMessage(streamContent);
  }
  // If skip_streaming is false, the intro will be streamed as chunks
}
```

**State Update**: `streamingMessage` ← adds intro text if `skip_streaming=true`
**UI Effect**: Intro text (e.g., "## Artist Discovery Research:") appears before streaming starts

---

#### Event: `artist_info` (completion)
**Lines**: 534-556

```typescript
if (data.type === "artist_info") {
  // Check if this is a "done" message (has userMessage/aiMessage)
  if (data.userMessage || data.aiMessage) {
    // This is a completion message, treat it as "done"
    console.log("[FRONTEND DEBUG] artist_info done event detected");

    try {
      await loadConversation(conversationId);
      console.log("[FRONTEND DEBUG] loadConversation completed");

      // Clear streaming state immediately (React batches updates)
      setStreamingMessage("");
      setStreamingMarketplaceData(null);
      console.log("[FRONTEND DEBUG] Streaming state cleared immediately");
    } catch (err) {
      console.error("Error reloading conversation:", err);
      setStreamingMessage("");
      setStreamingMarketplaceData(null);
    }
    continue;
  }
  // ... handle artist data (currently disabled)
}
```

**State Updates**:
1. `messages` ← reloaded from database (via `loadConversation`)
2. `streamingMessage` ← cleared
3. `streamingMarketplaceData` ← cleared

**UI Effect**: Streaming bubble disappears, saved message appears from database

---

#### Event: `done`
**Lines**: 617-637

```typescript
if (data.type === "done") {
  console.log("[FRONTEND DEBUG] done event detected, calling loadConversation");

  // Always reload conversation to get the complete state from database
  try {
    await loadConversation(conversationId);
    console.log("[FRONTEND DEBUG] loadConversation completed successfully");

    // Clear streaming state immediately
    // React batches state updates, so setMessages() from loadConversation
    // and these clear calls will render in the same cycle
    setStreamingMessage("");
    setStreamingMarketplaceData(null);
    console.log("[FRONTEND DEBUG] Streaming state cleared immediately");
  } catch (err) {
    console.error("Error reloading conversation:", err);
    setStreamingMessage("");
    setStreamingMarketplaceData(null);
  }
}
```

**State Updates**:
1. `messages` ← reloaded from database
2. `streamingMessage` ← ""
3. `streamingMarketplaceData` ← null

**UI Effect**: Seamless transition from streaming bubble to saved message

---

## 4. Display Rendering

### A. Streaming Display (Real-time)

**Location**: `src/app/page.tsx` (lines 846-868)

**Conditional Rendering**:

```typescript
{(streamingMessage || streamingMarketplaceData) && (
  <div className="flex gap-2 sm:gap-4 items-start justify-start">
    <AIAvatar />
    <div className="max-w-[90vw] sm:max-w-3xl lg:max-w-4xl px-4 py-4 sm:px-8 sm:py-5
                    rounded-2xl bg-white dark:bg-gray-800 border border-gray-200">

      {/* Display marketplace data BEFORE text (default) */}
      {streamingMarketplaceData && (
        <div className={streamingMessage ? "mb-4" : ""}>
          <Suspense fallback={<div>Loading marketplace data...</div>}>
            <MarketplaceCard data={streamingMarketplaceData} />
          </Suspense>
        </div>
      )}

      {/* Display streaming text */}
      {streamingMessage && (
        <Suspense fallback={<div>Loading...</div>}>
          <Markdown content={streamingMessage} className="text-base" />
        </Suspense>
      )}
    </div>
  </div>
)}
```

**Layout**:
```
┌────────────────────────────────────┐
│ AI Avatar  ┌───────────────────┐   │
│            │ MarketplaceCard   │   │  ← streamingMarketplaceData
│            ├───────────────────┤   │
│            │                   │   │
│            │ Streaming Text    │   │  ← streamingMessage
│            │ with Markdown...  │   │
│            │                   │   │
│            └───────────────────┘   │
└────────────────────────────────────┘
```

### B. Saved Message Display

**Location**: `src/app/page.tsx` - `MessageItem` component (lines 94-195)

**Message Iteration** (lines 826-832):

```typescript
{messages.map((message) => (
  <MessageItem
    key={message.id}
    message={message}
    userName={session?.user?.name?.[0]?.toUpperCase() || "U"}
  />
))}
```

**MessageItem Component** (lines 145-172):

```typescript
// For regular AI messages (not artist_info)
{message.sender === "ai" && (
  <>
    {/* Display marketplace data BEFORE text (default position) */}
    {message.marketplace_data &&
     (!message.marketplace_position || message.marketplace_position === "before") && (
      <div className={message.content ? "mb-4" : ""}>
        <Suspense fallback={<div>Loading marketplace data...</div>}>
          <MarketplaceCard data={message.marketplace_data} />
        </Suspense>
      </div>
    )}

    {/* Display text content if present */}
    {message.content && (
      <Suspense fallback={<div>Loading...</div>}>
        <Markdown content={message.content} className="text-base" />
      </Suspense>
    )}

    {/* Display marketplace data AFTER text (if position === "after") */}
    {message.marketplace_data &&
     message.marketplace_position === "after" && (
      <div className={message.content ? "mt-4" : ""}>
        <Suspense fallback={<div>Loading marketplace data...</div>}>
          <MarketplaceCard data={message.marketplace_data} />
        </Suspense>
      </div>
    )}
  </>
)}
```

**Layout Options**:

**Position: "before" (default)**:
```
┌────────────────────────────────────┐
│ AI Avatar  ┌───────────────────┐   │
│            │ MarketplaceCard   │   │
│            ├───────────────────┤   │
│            │ Message Text      │   │
│            └───────────────────┘   │
└────────────────────────────────────┘
```

**Position: "after"**:
```
┌────────────────────────────────────┐
│ AI Avatar  ┌───────────────────┐   │
│            │ Message Text      │   │
│            ├───────────────────┤   │
│            │ MarketplaceCard   │   │
│            └───────────────────┘   │
└────────────────────────────────────┘
```

**Artist Info Messages** (lines 134-144):

```typescript
{message.type === "artist_info" && message.artist && (
  <Suspense fallback={<div>Loading...</div>}>
    <ArtistCard
      artist={message.artist}
      message={message.message}
      researchType={message.research_type}
      text={message.text}
      streamingText={message.streaming_text}
      hasExistingData={message.has_existing_data}
    />
  </Suspense>
)}
```

---

## 5. Event Sequence Diagram

### Typical Flow for Artist Question

```
USER ACTION                  BACKEND                      FRONTEND                    UI
───────────                  ───────                      ────────                    ──

Send message
"Tell me about
Antonio Kuschnir"
     │
     │
     ▼
                        Save user message
                        to database
                             │
                             │
                             ▼
                        Call Prophetic API
                        with history
                             │
                             │
                        ┌────▼─────────────────────────────────────────────┐
                        │ SSE STREAM BEGINS                                 │
                        └──────────────────────────────────────────────────┘
                             │
                             │ marketplace_data
                             ├──────────────────────────────────────────────►
                             │                              setStreamingMarketplaceData()
                             │                                          │
                             │                                          ▼
                             │                                    ┌─────────────┐
                             │                                    │ Marketplace │
                             │                                    │    Card     │
                             │                                    │  appears    │
                             │                                    └─────────────┘
                             │
                             │ metadata
                             │ (intro: "## Artist Discovery Research:")
                             ├──────────────────────────────────────────────►
                             │                              setStreamingMessage()
                             │                              (adds intro text)
                             │                                          │
                             │                                          ▼
                             │                                    ┌─────────────┐
                             │                                    │ Marketplace │
                             │                                    │    Card     │
                             │                                    ├─────────────┤
                             │                                    │ ## Artist...│
                             │                                    └─────────────┘
                             │
                             │ chunk
                             │ (content: "Antonio...")
                             ├──────────────────────────────────────────────►
                             │                              setStreamingMessage()
                             │                              (appends content)
                             │                                          │
                             │                                          ▼
                             │                                    ┌─────────────┐
                             │                                    │ Marketplace │
                             │                                    │    Card     │
                             │                                    ├─────────────┤
                             │                                    │ ## Artist...│
                             │                                    │ Antonio...  │
                             │                                    └─────────────┘
                             │
                             │ chunk (more content)
                             ├──────────────────────────────────────────────►
                             │                              setStreamingMessage()
                             │                                          │
                             │                                          ▼
                             │                                    Text updates...
                             │
                             │ chunk (more content)
                             ├──────────────────────────────────────────────►
                             │                              setStreamingMessage()
                             │                                          │
                             │                                          ▼
                             │                                    Text updates...
                             │
                        ┌────▼─────────────────────────────────────────────┐
                        │ SAVE TO DATABASE                                  │
                        │ - content: fullResponse (all chunks)              │
                        │ - metadata.marketplace_data: {artist profile}     │
                        │ - metadata.marketplace_position: "before"         │
                        └───────────────────────────────────────────────────┘
                             │
                             │ done
                             │ (with aiMessage record)
                             ├──────────────────────────────────────────────►
                             │                              loadConversation()
                             │                              (fetches from DB)
                             │                                          │
                             │                                          ▼
                             │                              setMessages([...])
                             │                              setStreamingMessage("")
                             │                              setStreamingMarketplaceData(null)
                             │                                          │
                             │                                          ▼
                        ┌────▼─────────────────────────────────────────────┐
                        │ SSE STREAM ENDS                                   │
                        └───────────────────────────────────────────────────┘
                                                                      │
                                                                      ▼
                                                              ┌─────────────┐
                                                              │ Saved       │
                                                              │ Message     │
                                                              │ appears     │
                                                              │ with both   │
                                                              │ marketplace │
                                                              │ & text      │
                                                              └─────────────┘
```

### State Transitions

```
INITIAL STATE
─────────────
streamingMessage = ""
streamingMarketplaceData = null
messages = [previous messages...]

                ↓
        marketplace_data event
                ↓

STREAMING STATE 1
─────────────────
streamingMessage = ""
streamingMarketplaceData = {artist profile}  ← SET
messages = [previous messages...]

                ↓
        metadata + chunk events
                ↓

STREAMING STATE 2
─────────────────
streamingMessage = "## Artist Discovery Research:\nAntonio..."  ← ACCUMULATING
streamingMarketplaceData = {artist profile}
messages = [previous messages...]

                ↓
        more chunk events
                ↓

STREAMING STATE 3
─────────────────
streamingMessage = "## Artist Discovery Research:\nAntonio... [full text]"  ← COMPLETE
streamingMarketplaceData = {artist profile}
messages = [previous messages...]

                ↓
        done event
                ↓

FINAL STATE
───────────
streamingMessage = ""  ← CLEARED
streamingMarketplaceData = null  ← CLEARED
messages = [previous messages..., {
  id: 123,
  content: "## Artist Discovery Research:\nAntonio... [full text]",
  marketplace_data: {artist profile},
  marketplace_position: "before"
}]  ← NEW MESSAGE ADDED
```

---

## 6. State Management

### Frontend State Variables

**Location**: `src/app/page.tsx` (lines 216-234)

```typescript
// Message state
const [messages, setMessages] = useState<Message[]>([]);
const [streamingMessage, setStreamingMessage] = useState("");
const [streamingMarketplaceData, setStreamingMarketplaceData] = useState<MarketplaceData | null>(null);

// UI state
const [isLoading, setIsLoading] = useState(false);
const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
```

### State Variable Purposes

| Variable | Type | Purpose | Cleared When |
|----------|------|---------|--------------|
| `messages` | `Message[]` | Persisted messages from database | Never (accumulates) |
| `streamingMessage` | `string` | Real-time text content during streaming | After `done` event |
| `streamingMarketplaceData` | `MarketplaceData \| null` | Real-time marketplace data | After `done` event |
| `isLoading` | `boolean` | Loading indicator before streaming starts | When first event arrives |
| `shouldAutoScroll` | `boolean` | Auto-scroll to bottom control | User scroll interaction |

### Auto-scroll Behavior

**Location**: `src/app/page.tsx` (lines 290-294)

```typescript
useEffect(() => {
  if (shouldAutoScroll) {
    scrollToBottom();
  }
}, [messages, streamingMessage, streamingMarketplaceData, isLoading, shouldAutoScroll]);
```

**Triggers**: Any change to:
- `messages` array (new message added)
- `streamingMessage` (new chunk)
- `streamingMarketplaceData` (marketplace data received)
- `isLoading` state change

### Streaming → Saved Transition

**Key Insight**: React's automatic state batching ensures that clearing streaming state and updating messages array happen in the same render cycle, preventing visual glitches.

**Before (problematic)**:
```typescript
await loadConversation(conversationId);  // setMessages() called
setTimeout(() => {
  setStreamingMessage("");               // Cleared 100ms later
  setStreamingMarketplaceData(null);     // Cleared 100ms later
}, 100);
// Result: Both streaming bubble AND saved message visible for 100ms
```

**After (fixed)**:
```typescript
await loadConversation(conversationId);  // setMessages() called
setStreamingMessage("");                 // Cleared immediately
setStreamingMarketplaceData(null);       // Cleared immediately
// Result: React batches all updates into single render cycle
```

### Message Interface

**Location**: `src/app/page.tsx` (lines 51-66)

```typescript
interface Message {
  id: number;
  content: string;                    // Text content
  sender: "user" | "ai";
  created_at: string;
  type?: string;                      // "artist_info", "marketplace_data", etc.
  marketplace_data?: MarketplaceData; // Extracted from metadata
  marketplace_position?: "before" | "after"; // Placement control

  // Artist info fields (if type === "artist_info")
  message?: string;
  research_type?: string;
  artist?: ArtistData;
  has_existing_data?: boolean;
  text?: string;
  streaming_text?: boolean;
}
```

---

## 7. Component Hierarchy

### Rendering Tree

```
Home (page.tsx)
│
├─ Chat Container (lines 782-905)
│  │
│  ├─ Messages Area (lines 782-872)
│  │  │
│  │  ├─ Saved Messages (lines 826-832)
│  │  │  │
│  │  │  └─ MessageItem × N (lines 94-195)
│  │  │     │
│  │  │     ├─ IF type === "artist_info"
│  │  │     │  └─ ArtistCard
│  │  │     │     └─ (Artist profile with research data)
│  │  │     │
│  │  │     └─ ELSE (regular message)
│  │  │        ├─ MarketplaceCard (if marketplace_data && position === "before")
│  │  │        ├─ Markdown (message content)
│  │  │        └─ MarketplaceCard (if marketplace_data && position === "after")
│  │  │
│  │  ├─ Typing Indicator (lines 835-843)
│  │  │  │
│  │  │  └─ Shown when: isLoading && !streamingMessage && !streamingMarketplaceData
│  │  │     └─ TypingIndicator component
│  │  │
│  │  └─ Streaming Bubble (lines 846-868)
│  │     │
│  │     └─ Shown when: streamingMessage || streamingMarketplaceData
│  │        ├─ AIAvatar
│  │        └─ Message Container
│  │           ├─ MarketplaceCard (if streamingMarketplaceData)
│  │           └─ Markdown (streamingMessage)
│  │
│  └─ Input Area (lines 874-905)
│     ├─ Textarea (user input)
│     └─ Send Button
│
└─ Sidebar (collapsible, conversation list)
```

### Component Props Flow

**MessageItem Component**:
```typescript
interface MessageItemProps {
  message: Message;      // Complete message object from database
  userName: string;      // User's first initial for avatar
}
```

**MarketplaceCard Component**:
```typescript
interface MarketplaceCardProps {
  data: MarketplaceData;
}

interface MarketplaceData {
  found: boolean;
  marketplace: string;           // "artsy", "opensea", etc.
  artist_profile?: ArtistProfile;
  artworks?: Artwork[];
  error?: string;
}
```

**ArtistCard Component**:
```typescript
interface ArtistCardProps {
  artist: ArtistData;
  message?: string;
  researchType?: string;
  text?: string;
  streamingText?: boolean;
  hasExistingData?: boolean;
}
```

### Conditional Rendering Logic

**1. Saved Messages** (always shown):
```typescript
{messages.map((message) => (
  <MessageItem key={message.id} message={message} userName={userName} />
))}
```

**2. Loading Indicator** (shown while waiting):
```typescript
{isLoading && !streamingMessage && !streamingMarketplaceData && (
  <TypingIndicator />
)}
```

**3. Streaming Bubble** (shown during streaming):
```typescript
{(streamingMessage || streamingMarketplaceData) && (
  <div>
    {streamingMarketplaceData && <MarketplaceCard data={streamingMarketplaceData} />}
    {streamingMessage && <Markdown content={streamingMessage} />}
  </div>
)}
```

**Rendering States**:
```
State 1: Before sending message
├─ Saved messages ✓
├─ Loading indicator ✗
└─ Streaming bubble ✗

State 2: After sending, waiting for first event
├─ Saved messages ✓
├─ Loading indicator ✓  (isLoading = true)
└─ Streaming bubble ✗

State 3: During streaming
├─ Saved messages ✓
├─ Loading indicator ✗  (isLoading = false)
└─ Streaming bubble ✓  (streamingMessage or streamingMarketplaceData set)

State 4: After done event
├─ Saved messages ✓  (includes new message)
├─ Loading indicator ✗
└─ Streaming bubble ✗  (streaming state cleared)
```

---

## 8. File Reference

### Quick Lookup Table

| File | Lines | Component/Function | Purpose |
|------|-------|-------------------|---------|
| **Backend API Routes** | | | |
| `src/app/api/conversations/[id]/messages/route.ts` | 100-412 | POST handler | Main SSE streaming endpoint |
| | 116-134 | User message save | Stores user message in database |
| | 135-148 | History building | Fetches conversation context |
| | 149-163 | Prophetic API call | Sends request to AI service |
| | 165-322 | SSE processing | Parses and forwards events |
| | 224-236 | marketplace_data handler | Captures and forwards marketplace data |
| | 210-221 | metadata handler | Handles intro text |
| | 239-306 | chunk handler | Accumulates text content |
| | 324-378 | Database save | Stores complete message with metadata |
| | 404-410 | Completion signal | Sends done event |
| `src/app/api/conversations/[id]/route.ts` | 92-105 | Message reconstruction | Extracts marketplace_data from metadata |
| **Frontend Components** | | | |
| `src/app/page.tsx` | 50-75 | Message interface | TypeScript interface for messages |
| | 216-234 | State variables | React state declarations |
| | 290-294 | Auto-scroll effect | Triggers scroll on updates |
| | 310-350 | loadConversation | Fetches messages from API |
| | 444-651 | sendMessage | Sends message and handles SSE stream |
| | 503-518 | Stream reader | Initializes SSE reader |
| | 531-533 | chunk event handler | Accumulates streaming text |
| | 596-607 | marketplace_data handler | Sets streaming marketplace state |
| | 609-616 | metadata handler | Adds intro text if skip_streaming |
| | 534-556 | artist_info handler | Triggers reload on completion |
| | 617-637 | done handler | Triggers reload and clears state |
| | 826-832 | Message list | Maps messages to MessageItem |
| | 835-843 | Typing indicator | Shows while loading |
| | 846-868 | Streaming bubble | Shows real-time streaming content |
| | 94-195 | MessageItem | Renders individual messages |
| | 134-144 | Artist info render | Renders ArtistCard |
| | 148-170 | Marketplace render | Renders MarketplaceCard with position |
| **Supporting Components** | | | |
| `src/components/MarketplaceCard.tsx` | 1-216 | MarketplaceCard | Displays marketplace search results |
| `src/components/ArtistCard.tsx` | 1-134 | ArtistCard | Displays artist research info |
| `src/components/Markdown.tsx` | 1-125 | Markdown | Renders markdown with syntax highlighting |

### Event Type Reference

| Event Type | Sent By | Handled In | State Updated | UI Component |
|------------|---------|------------|---------------|--------------|
| `marketplace_data` | Backend route.ts:224 | Frontend page.tsx:596 | `streamingMarketplaceData` | MarketplaceCard (streaming) |
| `metadata` | Backend route.ts:210 | Frontend page.tsx:609 | `streamingMessage` | Markdown (streaming) |
| `chunk` | Backend route.ts:297 | Frontend page.tsx:531 | `streamingMessage` | Markdown (streaming) |
| `artist_info` | Backend route.ts:254 | Frontend page.tsx:534 | `messages` (reload) | MessageItem → ArtistCard |
| `done` | Backend route.ts:404 | Frontend page.tsx:617 | `messages` (reload) | MessageItem |
| `error` | Backend route.ts:309 | Frontend page.tsx:640 | N/A | Console error |

### Database Schema Reference

**messages table**:
```sql
{
  id: number (PK),
  conversation_id: number (FK),
  content: text,              -- Full text response
  sender: "user" | "ai",
  created_at: timestamp,
  metadata: jsonb             -- Contains marketplace_data, structured_data
}
```

**metadata structure**:
```typescript
{
  type?: "marketplace_data" | "artist_info",
  structured_data?: any,
  marketplace_data?: {
    found: boolean,
    marketplace: string,
    artist_profile?: {...},
    artworks?: [...]
  },
  marketplace_position?: "before" | "after"
}
```

---

## Summary

This streaming architecture provides:

1. **Real-time UX**: Marketplace data and text appear as they stream from the AI
2. **Data Persistence**: Complete messages are saved to database with all metadata
3. **Smooth Transitions**: React state batching prevents visual glitches during streaming → saved transition
4. **Flexible Layout**: Marketplace data can be positioned before or after text content
5. **Error Resilience**: Streaming state is always cleared, even on errors
6. **Separation of Concerns**: Backend handles SSE parsing and storage, frontend handles display

For questions or issues with the streaming flow, refer to the file reference table above to locate the relevant code sections.
