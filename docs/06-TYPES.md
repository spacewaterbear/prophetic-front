# 06 - Type Definitions

Comprehensive reference for all TypeScript types, interfaces, enums, and constants defined in `src/types/`.

---

## Table of Contents

1. [src/types/chat.ts](#srctypeschatts) -- Core chat data structures and constants
2. [src/types/agents.ts](#srctypesagentsts) -- User statuses, agent types, and access control
3. [src/types/vignettes.ts](#srctypesvignettests) -- Investment category vignettes
4. [src/types/next-auth.d.ts](#srctypesnext-authdts) -- NextAuth session/user augmentation
5. [Related External Type: ClothesSearchData](#related-external-type-clothessearchdata)
6. [Type Relationship Diagram](#type-relationship-diagram)

---

## src/types/chat.ts

The central type file for the chat system. Defines message structures, marketplace data, and session-storage pending objects. Imports `VignetteData` from `@/types/vignettes` and `ClothesSearchData` from `@/components/ClothesSearchCard`.

### Interface: `Artist`

Represents an artist profile returned by the backend when discussing art investments.

```typescript
export interface Artist {
  artist_name: string;
  artist_picture_url: string | null;
  primary_country: string | null;
  country_iso_code: string | null;
  total_artworks: number | null;
  ratio_sold?: number;
  social_score?: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `artist_name` | `string` | Full name of the artist. |
| `artist_picture_url` | `string \| null` | URL to the artist's profile image. Null when no image is available. |
| `primary_country` | `string \| null` | Artist's primary country of origin or activity. |
| `country_iso_code` | `string \| null` | ISO country code (e.g. `"FR"`, `"US"`). Used for flag display. |
| `total_artworks` | `number \| null` | Total number of catalogued artworks. Null if unknown. |
| `ratio_sold` | `number` (optional) | Percentage of artworks sold (0-1 range). Indicates market demand. |
| `social_score` | `number` (optional) | Social media/market visibility score. |

**Usage context:** Embedded within `Message.artist`. Rendered by `ArtistCard` component. Populated via the `artist_info` SSE event during chat streaming in `useChatConversation`.

---

### Interface: `MarketplaceData`

Art marketplace search results returned alongside AI responses.

```typescript
export interface MarketplaceData {
  found: boolean;
  marketplace: string;
  artist_profile?: {
    name: string;
    url: string;
    artwork_count?: number;
  } | null;
  artworks?: Array<{
    title: string;
    price: string;
    url: string;
    image_url?: string;
  }>;
  total_artworks?: number;
  error_message?: string | null;
  search_metadata?: Record<string, unknown>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `found` | `boolean` | Whether any marketplace results were found. |
| `marketplace` | `string` | Name of the marketplace source (e.g. "Artsy", "Artnet"). |
| `artist_profile` | `{ name, url, artwork_count? } \| null` (optional) | Link to the artist's profile page on the marketplace. |
| `artist_profile.name` | `string` | Artist name as listed on the marketplace. |
| `artist_profile.url` | `string` | Direct URL to the artist's marketplace profile. |
| `artist_profile.artwork_count` | `number` (optional) | Number of artworks available on this marketplace. |
| `artworks` | `Array<{ title, price, url, image_url? }>` (optional) | List of individual artwork listings. |
| `artworks[].title` | `string` | Artwork title. |
| `artworks[].price` | `string` | Formatted price string (includes currency). |
| `artworks[].url` | `string` | Direct link to the artwork listing. |
| `artworks[].image_url` | `string` (optional) | Thumbnail image of the artwork. |
| `total_artworks` | `number` (optional) | Total number of artworks found (may exceed the returned array length). |
| `error_message` | `string \| null` (optional) | Error description if the marketplace search failed. |
| `search_metadata` | `Record<string, unknown>` (optional) | Additional search metadata from the marketplace API. |

**Usage context:** Embedded within `Message.marketplace_data`. Rendered by `MarketplaceCard` component. Populated via the `marketplace_data` SSE event. Used in `ConversationView`, `StreamingBubble`, and `useChatConversation`.

---

### Interface: `RealEstateData`

Real estate property search results for luxury real estate investments.

```typescript
export interface RealEstateData {
  found: boolean;
  marketplace: string;
  location: string;
  location_slug?: string;
  properties: Array<{
    title: string;
    price: string;
    price_amount: number;
    price_currency: string;
    url: string;
    image_url: string;
    bedrooms?: number;
    bathrooms?: number;
    square_meters?: number;
    square_feet?: number;
    property_type: string;
    listing_id?: string;
  }>;
  total_properties: number;
  search_url?: string;
  filters_applied?: Record<string, unknown>;
  error_message?: string | null;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `found` | `boolean` | Whether any properties were found. |
| `marketplace` | `string` | Source marketplace name. |
| `location` | `string` | Human-readable location description (e.g. "Paris 16e"). |
| `location_slug` | `string` (optional) | URL-friendly location identifier. |
| `properties` | `Array<...>` | List of property listings. |
| `properties[].title` | `string` | Property listing title. |
| `properties[].price` | `string` | Formatted price string with currency symbol. |
| `properties[].price_amount` | `number` | Raw numeric price value for sorting/filtering. |
| `properties[].price_currency` | `string` | Currency code (e.g. `"EUR"`, `"USD"`). |
| `properties[].url` | `string` | Direct link to the property listing. |
| `properties[].image_url` | `string` | Main property image URL. |
| `properties[].bedrooms` | `number` (optional) | Number of bedrooms. |
| `properties[].bathrooms` | `number` (optional) | Number of bathrooms. |
| `properties[].square_meters` | `number` (optional) | Property size in square meters. |
| `properties[].square_feet` | `number` (optional) | Property size in square feet. |
| `properties[].property_type` | `string` | Type of property (e.g. "apartment", "villa"). |
| `properties[].listing_id` | `string` (optional) | Marketplace-specific listing identifier. |
| `total_properties` | `number` | Total properties found (may exceed returned array). |
| `search_url` | `string` (optional) | URL to the full search results on the marketplace. |
| `filters_applied` | `Record<string, unknown>` (optional) | Filters used in the search query. |
| `error_message` | `string \| null` (optional) | Error description if the search failed. |

**Usage context:** Embedded within `Message.real_estate_data`. Rendered by `RealEstateCard` component. Populated via the `real_estate_data` SSE event. Used in `ConversationView`, `StreamingBubble`, and `useChatConversation`.

---

### Interface: `Message`

The core message type representing a single chat message (user or AI) with all possible attached data.

```typescript
export interface Message {
  id: number;
  content: string;
  sender: "user" | "ai";
  created_at: string;
  type?: string;
  message?: string;
  research_type?: string;
  artist?: Artist;
  has_existing_data?: boolean;
  text?: string;
  streaming_text?: string;
  marketplace_data?: MarketplaceData;
  marketplace_position?: "before" | "after";
  real_estate_data?: RealEstateData;
  vignette_data?: VignetteData[];
  clothes_search_data?: ClothesSearchData;
  vignetteCategory?: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `number` | Unique message identifier from the database. |
| `content` | `string` | Primary text content of the message (markdown for AI responses). |
| `sender` | `"user" \| "ai"` | Who sent the message. |
| `created_at` | `string` | ISO 8601 timestamp of message creation. |
| `type` | `string` (optional) | Message type classifier (e.g. for special rendering logic). |
| `message` | `string` (optional) | Alternative text content field (used in some backend response formats). |
| `research_type` | `string` (optional) | Type of research performed (e.g. "flash_invest", "ranking"). |
| `artist` | `Artist` (optional) | Attached artist profile data for art-related queries. |
| `has_existing_data` | `boolean` (optional) | Whether the message has pre-loaded supplementary data. |
| `text` | `string` (optional) | Fallback text content field. |
| `streaming_text` | `string` (optional) | Partial text during live streaming (used by `StreamingBubble`). |
| `marketplace_data` | `MarketplaceData` (optional) | Art marketplace search results attached to this message. |
| `marketplace_position` | `"before" \| "after"` (optional) | Whether to render marketplace data before or after the message text. |
| `real_estate_data` | `RealEstateData` (optional) | Real estate listings attached to this message. |
| `vignette_data` | `VignetteData[]` (optional) | Investment category vignette cards attached to this message. |
| `clothes_search_data` | `ClothesSearchData` (optional) | Fashion/clothes search results attached to this message. |
| `vignetteCategory` | `string` (optional) | The investment category this message relates to (matches `Vignettes` enum values). |

**Usage context:** The most widely used type in the application. Consumed by `MessageItem`, `ConversationView`, `StreamingBubble`, `WelcomeScreen`, `useChatConversation`, and the chat page orchestrator. Loaded from the database via `/api/conversations/[id]` and constructed during SSE streaming.

---

### Interface: `PendingMessage`

Represents a user message waiting to be sent after a conversation is created. Stored in `sessionStorage` under the key `pendingChatMessage`.

```typescript
export interface PendingMessage {
  content: string;
  flashCards?: string;
  flashCardType?: "flash_invest" | "ranking" | "portfolio" | "PORTFOLIO";
  scrollToTop?: boolean;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `content` | `string` | The user's message text. |
| `flashCards` | `string` (optional) | Category identifier for flashcard-triggered messages (e.g. `"ART"`, `"WINE"`). Maps to `FLASHCARD_MAPPING` values. |
| `flashCardType` | `"flash_invest" \| "ranking" \| "portfolio" \| "PORTFOLIO"` (optional) | The type of flashcard interaction that triggered this message. |
| `scrollToTop` | `boolean` (optional) | Whether to scroll to the top of the conversation after sending. |

**Usage context:** Used in `useChatConversation` to persist a message across the redirect from `/chat` (no conversation) to `/chat/[id]` (new conversation). The hook reads this from `sessionStorage` on mount and processes it.

---

### Interface: `PendingVignetteStream`

Represents a vignette markdown stream waiting to be initiated after navigation. Stored in `sessionStorage` under the key `pendingVignetteStream`.

```typescript
export interface PendingVignetteStream {
  imageName: string;
  category: string;
  streamType: "sse";
  tier?: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `imageName` | `string` | Image/brand identifier for the vignette to stream. |
| `category` | `string` | Investment category (matches `Vignettes` enum value, e.g. `"ART"`, `"WINE"`). |
| `streamType` | `"sse"` | Always `"sse"` -- indicates Server-Sent Events streaming. |
| `tier` | `string` (optional) | User's subscription tier, used to determine content depth. |

**Usage context:** Used in `useChatConversation` when a user clicks a vignette card on the welcome screen. The pending stream is stored before redirect, then picked up after navigation to `/chat/[id]`.

---

### Interface: `PendingMarkdownStream`

Represents a generic markdown stream waiting to be initiated after navigation. Stored in `sessionStorage` under the key `pendingMarkdownStream`.

```typescript
export interface PendingMarkdownStream {
  type: "independant" | "dependant-without-sub" | "dependant-with-sub";
  params: Record<string, string>;
  options?: { userPrompt?: string; scrollToTop?: boolean };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"independant" \| "dependant-without-sub" \| "dependant-with-sub"` | Stream dependency type. `"independant"` streams standalone content. `"dependant-without-sub"` requires a parent context. `"dependant-with-sub"` requires both parent and sub-context. |
| `params` | `Record<string, string>` | Key-value parameters passed to the `/api/markdown` endpoint. |
| `options` | `{ userPrompt?, scrollToTop? }` (optional) | Additional streaming options. |
| `options.userPrompt` | `string` (optional) | Custom user prompt to prepend to the markdown request. |
| `options.scrollToTop` | `boolean` (optional) | Whether to scroll to top after stream completes. |

**Usage context:** Used in `useChatConversation` for non-vignette markdown streaming (e.g. portfolio analysis, flashcard deep dives). Follows the same sessionStorage-based pending pattern as `PendingVignetteStream`.

---

### Constant: `CATEGORY_DISPLAY_NAMES`

Maps internal category identifiers to human-readable display names.

```typescript
export const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  ART: "Art",
  ART_TRADING_VALUE: "Art Trading Value",
  BIJOUX: "Bijoux",
  CARDS_US: "US Sports Cards",
  CARS: "Voitures de Collections",
  CASH_FLOW_LEASING: "Cash-Flow Leasing",
  IMMO_LUXE: "Immobilier de Luxe",
  MONTRES_LUXE: "Montres de Luxe",
  SACS: "Sacs de Luxe",
  SNEAKERS: "Sneakers",
  WHISKY: "Whisky",
  WINE: "Wine",
  MARCHE_SPOT: "Marche Spot",
};
```

Keys correspond to the `Vignettes` enum values (plus `ART_TRADING_VALUE`, `CASH_FLOW_LEASING`, and `MARCHE_SPOT` which are additional categories). Display names are primarily in French, matching the product's luxury French branding.

**Usage context:** Used in `MessageItem` and `WelcomeScreen` to render human-readable category labels in the UI.

---

## src/types/agents.ts

Defines user subscription tiers, AI agent types, and the access-control function that maps user status to available agents.

### Type: `UserStatus`

Union type representing all possible user subscription/authorization statuses.

```typescript
export type UserStatus =
  | "unauthorized"
  | "free"
  | "paid"
  | "admini"
  | "discover"
  | "intelligence"
  | "oracle";
```

| Value | Description |
|-------|-------------|
| `"unauthorized"` | User has authenticated but is not yet approved. Redirected to `/registration-pending`. |
| `"free"` | Free-tier user. Treated as equivalent to `"discover"` for agent access. |
| `"paid"` | Legacy paid status. |
| `"admini"` | Administrator. Has access to all agents plus admin-only features (model selector, staging/preprod access). |
| `"discover"` | Discover subscription tier. Access to the `discover` agent only. |
| `"intelligence"` | Intelligence subscription tier. Access to `discover` and `intelligence` agents. |
| `"oracle"` | Oracle subscription tier (highest). Access to all three agents. |

**Usage context:** Used throughout the application for authorization checks. Consumed by `ChatInput`, `ConversationView`, `WelcomeScreen`, the chat page, and the middleware. Mirrors the `status` field on the NextAuth `Session.user` object.

---

### Type: `AgentType`

Union type for the three AI agent personalities.

```typescript
export type AgentType = "discover" | "intelligence" | "oracle";
```

| Value | Description |
|-------|-------------|
| `"discover"` | Entry-level agent. Provides general investment discovery and education. |
| `"intelligence"` | Mid-tier agent. Provides deeper market intelligence and analysis. |
| `"oracle"` | Premium agent. Provides comprehensive investment advice with the most sophisticated AI model. |

**Usage context:** Used by `ModeSelector`, `ChatInput`, `PortfolioMenu`, `MobileBottomSheets`, `ConversationView`, `WelcomeScreen`, and the chat page to control which agent is active and what features are available.

---

### Function: `getAvailableAgents`

Determines which AI agents a user can access based on their subscription status.

```typescript
export function getAvailableAgents(status: string | undefined): AgentType[] {
  const normalizedStatus = status === "free" ? "discover" : status;

  switch (normalizedStatus) {
    case "discover":
      return ["discover"];
    case "intelligence":
      return ["discover", "intelligence"];
    case "oracle":
    case "admini":
      return ["discover", "intelligence", "oracle"];
    default:
      return ["discover"];
  }
}
```

**Parameters:**
- `status` (`string | undefined`) -- The user's status string. Accepts any `UserStatus` value or `undefined`.

**Returns:** `AgentType[]` -- Array of agent types the user can access, always in ascending order of tier.

**Logic:**
- `"free"` is normalized to `"discover"` before the switch.
- `"discover"` returns only `["discover"]`.
- `"intelligence"` returns `["discover", "intelligence"]`.
- `"oracle"` and `"admini"` return all three agents.
- Any unknown or `undefined` status defaults to `["discover"]`.

**Usage context:** Called in `ChatInput` and the chat page (`src/app/chat/[[...conversationId]]/page.tsx`) to determine which agent modes to display in the mode selector and to validate agent selection.

---

## src/types/vignettes.ts

Defines the investment category enum and the data structure for vignette cards displayed on the welcome screen and in chat messages.

### Enum: `Vignettes`

Enumeration of all supported luxury investment categories.

```typescript
export enum Vignettes {
  ART = "ART",
  ART_TRADING_VALUE = "ART_TRADING_VALUE",
  BIJOUX = "BIJOUX",
  CARDS_US = "CARDS_US",
  CARS = "CARS",
  CASH_FLOW_LEASING = "CASH_FLOW_LEASING",
  IMMO_LUXE = "IMMO_LUXE",
  MONTRES_LUXE = "MONTRES_LUXE",
  SACS = "SACS",
  SNEAKERS = "SNEAKERS",
  WHISKY = "WHISKY",
  WINE = "WINE",
}
```

| Value | Display Name (from `CATEGORY_DISPLAY_NAMES`) | Description |
|-------|-----------------------------------------------|-------------|
| `ART` | Art | Fine art investment |
| `ART_TRADING_VALUE` | Art Trading Value | Art trading and valuation |
| `BIJOUX` | Bijoux | Jewelry investment |
| `CARDS_US` | US Sports Cards | American sports cards collecting |
| `CARS` | Voitures de Collections | Collectible/classic cars |
| `CASH_FLOW_LEASING` | Cash-Flow Leasing | Cash flow and leasing instruments |
| `IMMO_LUXE` | Immobilier de Luxe | Luxury real estate |
| `MONTRES_LUXE` | Montres de Luxe | Luxury watches |
| `SACS` | Sacs de Luxe | Luxury bags (e.g. Hermes, Chanel) |
| `SNEAKERS` | Sneakers | Sneaker investment |
| `WHISKY` | Whisky | Whisky investment |
| `WINE` | Wine | Wine investment |

**Usage context:** Used as the `category` field in `VignetteData`. Keys align with `CATEGORY_DISPLAY_NAMES` in `chat.ts`. Referenced in the vignette API route, welcome screen, and flashcard mappings.

---

### Interface: `VignetteData`

Represents a single vignette card -- a visual tile for a specific brand/item within an investment category.

```typescript
export interface VignetteData {
  category: Vignettes;
  brand_name: string;
  public_url: string;
  nb_insights: number;
  score?: number;
  trend?: "up" | "down";
  subtitle?: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `category` | `Vignettes` | The investment category this vignette belongs to. |
| `brand_name` | `string` | Brand or item name displayed on the vignette card (e.g. "Rolex Daytona", "Chateau Margaux"). |
| `public_url` | `string` | URL to the vignette's cover image (stored in Supabase storage). |
| `nb_insights` | `number` | Number of AI-generated insights available for this item. |
| `score` | `number` (optional) | Investment score or rating. |
| `trend` | `"up" \| "down"` (optional) | Market trend direction indicator. |
| `subtitle` | `string` (optional) | Secondary text displayed below the brand name. |

**Usage context:** Rendered by `VignetteGridCard` component. Loaded from the `/api/vignettes` endpoint. Attached to messages via `Message.vignette_data`. Used in `WelcomeScreen`, `MessageItem`, `StreamingBubble`, `ConversationView`, `useChatConversation`, and the chat page.

---

### Interface: `VignetteResponse`

API response wrapper for vignette data.

```typescript
export interface VignetteResponse {
  vignettes: VignetteData[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `vignettes` | `VignetteData[]` | Array of vignette data objects returned by the `/api/vignettes` endpoint. |

**Usage context:** Used as the response type for the `/api/vignettes` GET endpoint.

---

## src/types/next-auth.d.ts

TypeScript module augmentation for NextAuth.js v5. Extends the default `Session` and `User` interfaces to include application-specific fields.

### Module Augmentation: `"next-auth"`

```typescript
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      status?:
        | "unauthorized"
        | "free"
        | "paid"
        | "admini"
        | "discover"
        | "intelligence"
        | "oracle";
      isAdmin?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    status?:
      | "unauthorized"
      | "free"
      | "paid"
      | "admini"
      | "discover"
      | "intelligence"
      | "oracle";
    isAdmin?: boolean;
  }
}
```

#### Extended `Session` interface

The `Session.user` object is extended with:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique user identifier (from Supabase). |
| `status` | `UserStatus` values (optional) | The user's subscription/authorization status. Same values as the `UserStatus` type in `agents.ts`. |
| `isAdmin` | `boolean` (optional) | Whether the user has administrator privileges. Derived from `status === "admini"`. |

All fields from `DefaultSession["user"]` are preserved (includes `name`, `email`, `image` from NextAuth defaults).

#### Extended `User` interface

| Field | Type | Description |
|-------|------|-------------|
| `status` | `UserStatus` values (optional) | User's subscription status, loaded from the Supabase `profiles` table during authentication. |
| `isAdmin` | `boolean` (optional) | Administrator flag. |

**Usage context:** These augmented types are used globally wherever `useSession()` or `getServerSession()` is called. The `status` field drives agent access (via `getAvailableAgents`), route protection (via `middleware.ts`), and UI feature gating throughout the application.

---

## Related External Type: ClothesSearchData

Defined in `src/components/ClothesSearchCard.tsx` but imported into `chat.ts` and used as part of the `Message` interface. Documented here for completeness.

### Interface: `ClothesSearchData`

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

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"clothes_search_response"` | Literal type discriminator. |
| `query` | `string` | The search query that produced these results. |
| `total_listings` | `number` | Total number of listings found across all marketplaces. |
| `successful_marketplaces` | `number` | Number of marketplaces that returned results successfully. |
| `failed_marketplaces` | `number` | Number of marketplaces that failed to respond. |
| `marketplace_breakdown` | `Record<string, MarketplaceBreakdown>` | Per-marketplace result summary. Keys are marketplace names. |
| `listings` | `ClothesListing[]` | Array of individual clothing item listings. |
| `error_message` | `string \| null` | Overall error message, or null if successful. |
| `title` | `string` (optional) | Display title for the search results card. |
| `subtitle` | `string` (optional) | Display subtitle for the search results card. |

#### Supporting interface: `ClothesListing` (not exported)

```typescript
interface ClothesListing {
  marketplace: string;
  brand: string;
  description: string;
  price: number | null;
  currency: string | null;
  url: string;
  image_url: string | null;
  condition: string | null;
}
```

#### Supporting interface: `MarketplaceBreakdown` (not exported)

```typescript
interface MarketplaceBreakdown {
  total_listings: number;
  success: boolean;
  error_message: string | null;
}
```

**Usage context:** Embedded within `Message.clothes_search_data`. Rendered by `ClothesSearchCard` component. Populated via the `clothes_data` SSE event during streaming. Used in `useChatConversation`, `StreamingBubble`, and `ConversationView`.

---

## Type Relationship Diagram

```
next-auth.d.ts                    agents.ts
+-----------------------+         +---------------------------+
| Session.user.status --|-------->| UserStatus (union type)   |
| Session.user.isAdmin  |         |   "unauthorized"          |
| User.status           |         |   "free"                  |
| User.isAdmin          |         |   "discover"              |
+-----------------------+         |   "intelligence"          |
                                  |   "oracle"                |
                                  |   "admini"                |
                                  |   "paid"                  |
                                  +---------------------------+
                                  | AgentType (union type)    |
                                  |   "discover"              |
                                  |   "intelligence"          |
                                  |   "oracle"                |
                                  +---------------------------+
                                  | getAvailableAgents()      |
                                  |   UserStatus -> AgentType[]
                                  +---------------------------+

vignettes.ts                      chat.ts
+---------------------------+     +---------------------------+
| Vignettes (enum)          |     | Message                   |
|   ART, WINE, CARS, etc.  |     |   .artist?: Artist        |
+---------------------------+     |   .marketplace_data?:     |
| VignetteData              |---->|       MarketplaceData     |
|   .category: Vignettes    |     |   .real_estate_data?:     |
|   .brand_name             |     |       RealEstateData      |
|   .public_url             |     |   .vignette_data?:        |
|   .nb_insights            |     |       VignetteData[]      |
|   .score?                 |     |   .clothes_search_data?:  |
|   .trend?                 |     |       ClothesSearchData   |
+---------------------------+     +---------------------------+
| VignetteResponse          |     | PendingMessage            |
|   .vignettes:             |     | PendingVignetteStream     |
|       VignetteData[]      |     | PendingMarkdownStream     |
+---------------------------+     +---------------------------+
                                  | CATEGORY_DISPLAY_NAMES    |
                                  |   keys = Vignettes values |
                                  +---------------------------+

ClothesSearchCard.tsx (external)
+---------------------------+
| ClothesSearchData --------|---> Message.clothes_search_data
|   .listings:              |
|       ClothesListing[]    |
|   .marketplace_breakdown: |
|       MarketplaceBreakdown|
+---------------------------+
```

### Key Relationships

1. **`UserStatus` <-> `Session.user.status`**: The `next-auth.d.ts` augmentation repeats the same union literals as `UserStatus`. They are not formally linked via import but must stay in sync manually.

2. **`UserStatus` -> `AgentType`**: The `getAvailableAgents()` function bridges these two types, mapping subscription status to available agent access.

3. **`Vignettes` enum -> `VignetteData.category`**: Every vignette card is categorized using the enum.

4. **`Vignettes` enum -> `CATEGORY_DISPLAY_NAMES`**: The constant's keys mirror the enum values for display name lookup.

5. **`Message` aggregates all data types**: A single message can carry `Artist`, `MarketplaceData`, `RealEstateData`, `VignetteData[]`, and `ClothesSearchData` simultaneously, each populated by different SSE events during streaming.

6. **`Pending*` types bridge navigation**: `PendingMessage`, `PendingVignetteStream`, and `PendingMarkdownStream` are serialized to `sessionStorage` before navigation and deserialized after, enabling the conversation-creation-then-redirect pattern.
