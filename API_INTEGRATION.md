# Prophetic API Integration Documentation

This document describes the expected input/output format for the Prophetic API integration in the frontend application.

---

## ⚠️ API Contract Compatibility Guidelines

> [!CAUTION]
> **FOR LLMs MODIFYING THE BACKEND API**: This section defines the **strict contract** between the backend API and frontend application. Any changes to the API response format MUST maintain backward compatibility with this specification.

### Critical Rules for API Modifications

1. **NEVER remove or rename existing `type` values** in SSE responses
   - Existing types: `chunk`, `artist_info`, `marketplace_data`, `real_estate_data`, `metadata`, `status`, `error`, `done`
   - Frontend has specific handlers for each type
   - Removing a type will break frontend rendering

2. **NEVER change the structure of existing response fields**
   - Example: `marketplace_data.data.artworks` must remain an array
   - Example: `marketplace_position` must remain `"before" | "after"`
   - Changing field types or nesting will cause parsing errors

3. **ALWAYS maintain SSE format**: `data: {JSON}\n\n`
   - Frontend parser expects this exact format
   - Deviations will cause stream parsing failures

4. **PRESERVE all existing fields when adding new ones**
   - ✅ Safe: Adding `marketplace_data.data.total_count` (new field)
   - ❌ Unsafe: Renaming `marketplace_data.data.artworks` to `items`

5. **MAINTAIN request field compatibility**
   - Frontend sends: `question`, `model`, `session_id`, `user_id`, `conversation_history`, `tiers_level`
   - Backend MUST accept all these fields
   - Adding optional fields is safe; making existing fields required is NOT

6. **ENSURE error responses follow the error type format**
   - Must use: `{"type": "error", "error": "message"}`
   - Frontend extracts and displays the `error` field

### Safe Changes (Non-Breaking)

- ✅ Adding new optional fields to existing types
- ✅ Adding entirely new message types (frontend will ignore unknown types)
- ✅ Adding new values to enums (e.g., new `tiers_level` values)
- ✅ Enhancing error messages (keeping the `error` field structure)

### Unsafe Changes (Breaking)

- ❌ Removing or renaming `type` values
- ❌ Changing field names in existing structures
- ❌ Changing field types (string → number, object → array, etc.)
- ❌ Removing required fields from responses
- ❌ Changing SSE format or encoding
- ❌ Modifying the request schema (removing/renaming fields)

### Testing Checklist for API Changes

Before deploying API changes, verify:

- [ ] All existing `type` values still work
- [ ] SSE format is preserved: `data: {JSON}\n\n`
- [ ] Request fields match the specification
- [ ] Error responses use `{"type": "error", "error": "..."}`
- [ ] Marketplace data includes `found`, `marketplace`, `artworks` fields
- [ ] `marketplace_position` is `"before"` or `"after"` (if present)
- [ ] Completion signal includes `userMessage` and `aiMessage`

---

## API Endpoint

**URL**: `${PROPHETIC_API_URL}/prophetic/langchain_agent/query`  
**Method**: `POST`  
**Content-Type**: `application/json`  
**Authorization**: `Bearer ${PROPHETIC_API_TOKEN}`

---

## Request Format

The frontend sends the following JSON structure to the API:

```json
{
  "question": "string",
  "model": "string",
  "session_id": "string",
  "user_id": "string",
  "conversation_history": [
    {
      "role": "user | assistant",
      "content": "string"
    }
  ],
  "tiers_level": "DISCOVER | INTELLIGENCE | ORACLE"
}
```

### Request Fields

| Field | Type | Description |
|-------|------|-------------|
| `question` | `string` | The user's current message/query |
| `model` | `string` | AI model identifier (e.g., `"anthropic/claude-3.7-sonnet"`) |
| `session_id` | `string` | Conversation ID (converted to string) |
| `user_id` | `string` | User ID from the session |
| `conversation_history` | `array` | Last 5 messages in chronological order |
| `tiers_level` | `string` | User's subscription tier in uppercase |

---

## Response Format

The API returns **Server-Sent Events (SSE)** with the following format:

```
data: {"type": "...", ...}

```

Each SSE event contains a JSON object with a `type` field that determines how the frontend processes it.
 
---

## Response Message Types

### 1. Text Content Chunks

**Purpose**: Stream AI-generated text responses word-by-word

```json
{
  "type": "chunk",
  "content": "streaming text content..."
}
```

**Frontend Behavior**: Appends content to the message display in real-time

---

### 2. Artist Information

**Purpose**: Display structured artist data as a special card

```json
{
  "type": "artist_info",
  "data": {
    // Structured artist information
  }
}
```

**Frontend Behavior**: Renders as `ArtistCard` component  
**Storage**: Saved in message `metadata.structured_data`

---

### 3. Marketplace Data

**Purpose**: Show artwork listings from marketplaces

```json
{
  "type": "marketplace_data",
  "data": {
    "found": true,
    "marketplace": "artsy",
    "artworks": [
      {
        // Artwork details
      }
    ]
  },
  "marketplace_position": "before | after"
}
```

### Marketplace Data Fields

| Field | Type | Description |
|-------|------|-------------|
| `found` | `boolean` | Whether artworks were found |
| `marketplace` | `string` | Marketplace name (e.g., "artsy") |
| `artworks` | `array` | Array of artwork objects |
| `marketplace_position` | `string` | Display position: `"before"` or `"after"` main text |

**Frontend Behavior**: 
- Renders marketplace results as cards
- Position determines placement relative to text content
- Default: `"before"` for general queries, `"after"` for artist-specific queries

**Storage**: Saved in message `metadata.marketplace_data`

---

### 4. Real Estate Data

**Purpose**: Display luxury real estate search results

```json
{
  "type": "real_estate_data",
  "data": {
    // Luxury real estate listings
  }
}
```

**Frontend Behavior**: Renders real estate listings  
**Storage**: Saved in message `metadata.real_estate_data`

---

### 5. Metadata

**Purpose**: Provide introductory text and control streaming behavior

```json
{
  "type": "metadata",
  "intro": "introductory text",
  "skip_streaming": true
}
```

### Metadata Fields

| Field | Type | Description |
|-------|------|-------------|
| `intro` | `string` | Introductory text to display |
| `skip_streaming` | `boolean` | If true, intro text is added to full response |

**Frontend Behavior**: Forwards to client and optionally adds intro to response

---

### 6. Status Messages

**Purpose**: Show progress updates during processing

```json
{
  "type": "status",
  "message": "Searching marketplace..."
}
```

**Frontend Behavior**: Displays as loading indicator or status message  
**Common Uses**: "Analyzing artist...", "Searching databases...", etc.

---

### 7. Error Messages

**Purpose**: Display error information to the user

```json
{
  "type": "error",
  "error": "error message"
}
```

**Frontend Behavior**: Shows error message in the UI  
**Note**: Error messages are cleaned to extract user-friendly text from nested JSON structures

---

### 8. Completion Signal

**Purpose**: Signal end of stream and provide saved message records

```json
{
  "type": "done",
  "userMessage": {
    "id": 123,
    "content": "...",
    // Full user message record
  },
  "aiMessage": {
    "id": 124,
    "content": "...",
    "metadata": {
      // Structured data if present
    }
    // Full AI message record
  }
}
```

**Special Case**: If response contains artist info, type is `"artist_info"` instead of `"done"`

**Frontend Behavior**: Finalizes message display and updates UI state

---

## Advanced Features

### Nested SSE Support

The frontend can handle SSE data nested within content fields:

```json
{
  "content": "data: {\"type\": \"artist_info\", ...}\n\n"
}
```

This allows the backend to wrap SSE events in content fields if needed.

---

### Combined Responses

Multiple data types can be combined in a single response:

1. **Artist Info + Marketplace Data + Text**
   - Artist card displayed
   - Marketplace results shown after text (if artist query)
   - Text content streamed

2. **Metadata Storage**
   ```json
   {
     "type": "artist_info",
     "structured_data": { /* artist info */ },
     "marketplace_data": { /* marketplace results */ },
     "marketplace_position": "after",
     "real_estate_data": { /* real estate listings */ }
   }
   ```

---

## Database Storage

All AI responses are stored in the `messages` table with:

- **content**: Full text response (concatenated chunks)
- **metadata**: JSONB field containing:
  - `type`: Response type (e.g., "artist_info")
  - `structured_data`: Original structured response
  - `marketplace_data`: Marketplace results (if present)
  - `marketplace_position`: Display position (if marketplace data)
  - `real_estate_data`: Real estate results (if present)

---

## Implementation Reference

See [route.ts](file:///home/lamarmite/Documents/code/client/prophetic/prophetic-front/src/app/api/conversations/[id]/messages/route.ts) for the complete implementation of:
- Request construction (lines 146-153)
- SSE parsing (lines 192-386)
- Metadata handling (lines 388-438)
- Database storage (lines 450-485)

---

## Validation & Migration Guide

### How to Validate API Changes

When modifying the backend API, use these validation steps:

#### 1. **Request Validation**

Ensure your API endpoint accepts this exact structure:

```typescript
// ✅ REQUIRED: Backend must accept these fields
interface APIRequest {
  question: string;
  model: string;
  session_id: string;
  user_id: string;
  conversation_history: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  tiers_level: "DISCOVER" | "INTELLIGENCE" | "ORACLE";
}
```

#### 2. **Response Type Validation**

Test that your API returns valid SSE events for each type:

```bash
# Example: Test streaming response
curl -X POST "${API_URL}/prophetic/langchain_agent/query" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Tell me about Picasso",
    "model": "anthropic/claude-3.7-sonnet",
    "session_id": "123",
    "user_id": "user_123",
    "conversation_history": [],
    "tiers_level": "INTELLIGENCE"
  }'

# Expected output format:
# data: {"type": "status", "message": "Analyzing artist..."}
#
# data: {"type": "chunk", "content": "Pablo Picasso was..."}
#
# data: {"type": "artist_info", "data": {...}}
#
# data: {"type": "done", "userMessage": {...}, "aiMessage": {...}}
#
```

#### 3. **Frontend Parsing Validation**

The frontend parses SSE events like this:

```typescript
// Frontend expects this exact pattern
const lines = event.split("\n");
for (const line of lines) {
  if (line.startsWith("data: ")) {
    const eventData = line.slice(6); // Remove "data: "
    const parsed = JSON.parse(eventData);
    
    // Must have a 'type' field
    switch (parsed.type) {
      case "chunk": // Handle text
      case "artist_info": // Handle artist card
      case "marketplace_data": // Handle marketplace
      // ... etc
    }
  }
}
```

### Migration Examples

#### Example 1: Adding a New Field (Safe)

```diff
// ✅ SAFE: Adding optional field to marketplace_data
{
  "type": "marketplace_data",
  "data": {
    "found": true,
    "marketplace": "artsy",
    "artworks": [...],
+   "total_results": 150,  // New optional field
+   "search_query": "Picasso paintings"  // New optional field
  }
}
```

#### Example 2: Adding a New Message Type (Safe)

```diff
// ✅ SAFE: New type (frontend ignores unknown types)
+ {
+   "type": "gallery_data",
+   "data": {
+     "galleries": [...]
+   }
+ }
```

> [!NOTE]
> Frontend will ignore unknown types until updated to handle them

#### Example 3: Breaking Change (Unsafe)

```diff
// ❌ UNSAFE: Renaming field breaks frontend
{
  "type": "marketplace_data",
  "data": {
    "found": true,
    "marketplace": "artsy",
-   "artworks": [...],
+   "items": [...]  // BREAKS: Frontend expects "artworks"
  }
}
```

**Fix**: Use deprecation strategy instead:

```diff
// ✅ SAFE: Deprecation with backward compatibility
{
  "type": "marketplace_data",
  "data": {
    "found": true,
    "marketplace": "artsy",
    "artworks": [...],  // Keep for backward compatibility
+   "items": [...],     // Add new field
+   "_deprecated": {
+     "artworks": "Use 'items' instead (will be removed in v2.0)"
+   }
  }
}
```

### Error Handling Examples

#### Correct Error Format

```json
{
  "type": "error",
  "error": "User has exceeded their tier limit. Please upgrade to Intelligence tier."
}
```

#### Incorrect Error Formats (Will Break Frontend)

```json
// ❌ Missing 'type' field
{
  "error": "Something went wrong"
}

// ❌ Wrong type name
{
  "type": "failure",
  "message": "Error occurred"
}

// ❌ Nested error structure (frontend won't display correctly)
{
  "type": "error",
  "details": {
    "error": {
      "message": "Error"
    }
  }
}
```

---

## Quick Reference: Frontend Dependencies

### Files That Parse API Responses

1. **[route.ts:192-386](file:///home/lamarmite/Documents/code/client/prophetic/prophetic-front/src/app/api/conversations/[id]/messages/route.ts#L192-L386)** - SSE parsing logic
   - Handles all message types
   - Extracts and forwards data to client

2. **Frontend Components** (referenced in route.ts)
   - `ArtistCard.tsx` - Renders `artist_info` type
   - Message display - Renders `chunk` type
   - Status indicators - Renders `status` type

### Database Schema Dependencies

The `messages` table stores:
- `content`: Concatenated text chunks
- `metadata`: JSONB with structure:
  ```typescript
  {
    type?: string;
    structured_data?: object;
    marketplace_data?: object;
    marketplace_position?: "before" | "after";
    real_estate_data?: object;
  }
  ```

> [!IMPORTANT]
> Changing the metadata structure requires database migration AND frontend updates
