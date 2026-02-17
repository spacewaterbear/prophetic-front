# 05 - Lib Utilities

Comprehensive documentation of all utility modules, constants, and Supabase integrations located under `src/lib/`.

---

## Table of Contents

1. [utils.ts -- Tailwind Class Merging](#1-utilsts----tailwind-class-merging)
2. [models.ts -- AI Model Configuration](#2-modelsts----ai-model-configuration)
3. [translations.ts -- Internationalization Dictionary](#3-translationsts----internationalization-dictionary)
4. [markdown-utils.ts -- Markdown Enhancement Utilities](#4-markdown-utilsts----markdown-enhancement-utilities)
5. [constants/portfolio-tiers.ts -- Portfolio Tier Definitions](#5-constantsportfolio-tiersts----portfolio-tier-definitions)
6. [constants/flashcards.ts -- Flashcard Category Mapping](#6-constantsflashcardsts----flashcard-category-mapping)
7. [supabase/client.ts -- Public Supabase Client](#7-supabaseclientts----public-supabase-client)
8. [supabase/admin.ts -- Admin Supabase Client](#8-supabaseadmints----admin-supabase-client)
9. [supabase/server.ts -- Server-Side Supabase Client](#9-supabaseserverts----server-side-supabase-client)
10. [supabase/storage.ts -- File Upload/Delete with Retry](#10-supabasestoragets----file-uploaddelete-with-retry)
11. [supabase/profiles.ts -- User Profile Operations](#11-supabaseprofilests----user-profile-operations)
12. [supabase/types.ts -- Auto-Generated Database Types](#12-supabasetypests----auto-generated-database-types)
13. [utils/fileValidation.ts -- File Validation Utilities](#13-utilsfilevalidationts----file-validation-utilities)

---

## 1. `utils.ts` -- Tailwind Class Merging

**File:** `src/lib/utils.ts`

**Purpose:** Single utility function for merging Tailwind CSS class names with conflict resolution. Used throughout every component in the project.

**Dependencies:** `clsx`, `tailwind-merge`

### Exports

```typescript
export function cn(...inputs: ClassValue[]): string
```

**Implementation:**

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

`clsx` handles conditional class composition (arrays, objects, falsy values), then `twMerge` resolves Tailwind conflicts (e.g., `cn("px-4", "px-2")` yields `"px-2"`).

---

## 2. `models.ts` -- AI Model Configuration

**File:** `src/lib/models.ts`

**Purpose:** Defines all available AI model providers and their models, used for the admin model selector (OpenRouter routing). Non-admin users always use the default model.

### Interfaces

```typescript
export interface AIModel {
  id: string;           // OpenRouter model ID (e.g., "openai/gpt-4o")
  name: string;         // Display name (e.g., "GPT-4o")
  description: string;  // Short description
}

export interface AICompany {
  id: string;
  name: string;
  label: string;
  models: AIModel[];
}
```

### Constants

#### `AI_COMPANIES: Record<string, AICompany>`

All registered AI providers and their models:

| Provider Key | Label | Models |
|---|---|---|
| `openai` | OpenAI | `openai/gpt-4o`, `openai/gpt-4-turbo`, `openai/gpt-3.5-turbo` |
| `anthropic` | Anthropic | `anthropic/claude-sonnet-4.5`, `anthropic/claude-3.7-sonnet`, `anthropic/claude-3.5-sonnet` |
| `mistral` | Mistral | `mistralai/mistral-large`, `mistralai/mistral-medium-3.1`, `mistralai/mistral-small` |
| `grok` | grok | `openai/gpt-oss-120b` |
| `google` | Google | `google/gemini-2.5-pro`, `google/gemini-2.5-flash`, `google/gemini-2.5-flash-lite`, `google/gemini-3-pro-preview` |
| `perplexity` | Perplexity | `perplexity/sonar-deep-research`, `perplexity/sonar-pro`, `perplexity/sonar` |

#### `DEFAULT_NON_ADMIN_MODEL`

```typescript
export const DEFAULT_NON_ADMIN_MODEL = "anthropic/claude-sonnet-4.5";
```

### Helper Functions

```typescript
// Returns the first model ID for a given company, or fallback
export const getDefaultModel = (companyId: string): string => {
  return AI_COMPANIES[companyId]?.models[0]?.id || "anthropic/claude-3.7-sonnet";
};

// Searches all companies to find a model's display name
export const getModelDisplayName = (modelId: string): string => {
  for (const company of Object.values(AI_COMPANIES)) {
    const model = company.models.find(m => m.id === modelId);
    if (model) return model.name;
  }
  return modelId; // fallback: return raw model ID
};

// Returns the company ID that owns a given model, or null
export const getCompanyFromModelId = (modelId: string): string | null => {
  for (const company of Object.values(AI_COMPANIES)) {
    if (company.models.some(m => m.id === modelId)) {
      return company.id;
    }
  }
  return null;
};
```

---

## 3. `translations.ts` -- Internationalization Dictionary

**File:** `src/lib/translations.ts`

**Purpose:** Contains all UI text translations for 9 supported languages. Consumed by the `I18nProvider` and `useI18n()` hook.

### Supported Languages

```typescript
export type Language = "fr" | "en" | "es" | "de" | "it" | "pt" | "nl" | "ja" | "zh";
```

### Translation Structure

Each language object contains the following sections:

| Section | Keys | Description |
|---|---|---|
| `nav` | `newChat`, `recentChats`, `signOut`, `noConversations` | Sidebar navigation |
| `chat` | `greeting`, `welcomeMessage`, `welcomeSubtitle`, `placeholder`, `send`, `comingSoon`, `loading`, `loadingMarketplace`, `loadingRealEstate` | Chat interface text |
| `login` | `welcome`, `subtitle`, `continueWithGoogle`, `secureAuth`, `termsText`, `encryption`, `certified`, `orContinueWith`, `emailPlaceholder`, `sendMagicLink`, `sending`, `magicLinkSent`, `checkEmail`, `invalidEmail`, `sendError`, `tryAgain`, `completeRegistration`, `completeRegistrationSubtitle`, `firstName`, `lastName`, `firstNamePlaceholder`, `lastNamePlaceholder`, `createAccount`, `creating` | Login/registration page |
| `contextMenu` | `deepSearch` | Text selection context menu |
| `common` | `loading`, `error`, `success`, `cancel`, `confirm`, `delete`, `edit`, `save` | Shared labels |

Note: The `chat.greeting` key in `fr` and `en` includes a `{name}` placeholder for interpolation (e.g., `"Bonjour, {name}"`). Other languages use a plain greeting without placeholder.

Note: The `login` section in `es`, `de`, `it`, `pt`, `nl`, `ja`, `zh` does not include `completeRegistration`, `completeRegistrationSubtitle`, `firstName`, `lastName`, `firstNamePlaceholder`, `lastNamePlaceholder`, `createAccount`, or `creating` keys -- these fall back to English.

### Helper Function

```typescript
export function getTranslation(
  lang: Language,
  key: string,           // dot-separated path, e.g., "chat.greeting"
  fallbackLang: Language = "en"
): string
```

**Logic:**
1. Splits `key` by `.` and walks the translation object for the given `lang`.
2. If any segment is not found, falls back to `fallbackLang` (default: `"en"`).
3. If still not found, returns the raw key string.
4. Returns the final value only if it is a `string`; otherwise returns the key.

```typescript
// Example usage:
getTranslation("fr", "chat.greeting")     // "Bonjour, {name}"
getTranslation("es", "login.firstName")    // falls back to "en" -> "First name"
getTranslation("fr", "nonexistent.key")    // "nonexistent.key"
```

---

## 4. `markdown-utils.ts` -- Markdown Enhancement Utilities

**File:** `src/lib/markdown-utils.ts`

**Purpose:** Post-processes HTML generated by markdown parsers to create rich, styled UI elements. All functions operate on HTML strings, targeting `<table>` or `<pre><code>` blocks and replacing them with styled HTML using Tailwind/CSS classes.

### Functions

All functions share the same signature pattern:

```typescript
(html: string) => string
```

They find specific patterns in the HTML and replace them with styled equivalents. Each returns the modified HTML string, leaving non-matching content untouched.

---

#### `convertMarkdownTablesToStyledHtml(html: string): string`

Converts standard `<table>` elements (from markdown pipe tables) into styled tables with Tailwind classes.

**Detection:** Matches `<table>...</table>` blocks.

**Output structure:**
```html
<div class="table-scroll-wrapper premium-table-container my-4">
  <table class="w-full border border-prophetic-border-default rounded-lg overflow-hidden bg-prophetic-bg-card shadow-sm">
    <thead class="bg-prophetic-bg-elevated/50">
      <tr class="hover:bg-prophetic-bg-card-hover transition-colors">
        <th class="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-semibold text-prophetic-text-secondary uppercase tracking-wider">...</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-prophetic-border-default">
      <tr class="hover:bg-prophetic-bg-card-hover/50 transition-colors">
        <td class="px-3 py-2 sm:px-4 sm:py-3 text-sm text-prophetic-text-primary break-words">...</td>
      </tr>
    </tbody>
  </table>
</div>
```

---

#### `convertAsciiTablesToHtml(html: string): string`

Converts ASCII box-drawing tables (using `\u2500`, `\u2502`, `\u256d`, `\u2570` characters) found inside `<pre><code>` blocks into styled HTML tables.

**Detection:** Checks for presence of both `\u256d` and `\u2570` characters within code blocks.

**Output:** Generates `<table class="ascii-table">` with `label-cell` (first column) and `value-cell` (remaining columns) classes.

---

#### `convertRankingListsToHtml(html: string): string`

Converts ranking lists with progress bar characters into styled ranking cards.

**Detection:** Looks for lines matching `#\d+ \w+ \u25ac+\u2591*` pattern inside code blocks (e.g., `#1 ArtistName \u25ac\u25ac\u25ac\u25ac\u2591\u2591`).

**Features:**
- Parses rank number, name, progress bar percentage (filled `\u25ac` vs empty `\u2591` characters)
- Detects `-+-` markers in names to flag items as having analysis (adds `cursor-pointer` and `data-analysis` attribute)
- Parses optional description line following the ranking line

**Output:** `<div class="ranking-list">` containing `ranking-card` elements with progress bars.

---

#### `convertExtendedRankingsToHtml(html: string): string`

Converts extended artist rankings with numeric scores and detail lines.

**Detection:** Lines matching `#\d+ .+ \d{2,3}` (rank + name + 2-3 digit score).

**Features:**
- Parses rank, name (with `-+-` analysis marker detection), score
- Collects subsequent non-header lines as detail rows
- Detail lines split by 2+ spaces are displayed as key-value pairs

**Output:** `<div class="extended-rankings">` with `extended-ranking-card` elements showing score badges and detail grids.

---

#### `convertBarChartsToHtml(html: string): string`

Converts ASCII bar charts to styled horizontal bar components.

**Detection:** Pattern `Label  ||||||  number` -- all lines in the code block must match. Minimum 3 lines.

**Features:**
- Calculates percentage from score (out of 100)
- Assigns tier classes: `high` (>=75), `mid` (50-74), `low` (<50)

**Output:** `<div class="bar-chart-container">` with `bar-chart-row` elements containing label, track with fill, and score.

---

#### `convertPerfBarsToHtml(html: string): string`

Converts performance comparison bars showing percentage changes.

**Detection:** Pattern `+18%  ||||||||  Label text` -- all lines must match, minimum 2.

**Features:**
- Parses percentage value (positive/negative/neutral)
- Fill width relative to longest bar in the set
- Sign-based CSS modifier classes: `positive`, `negative`, `neutral`

**Output:** `<div class="perf-bars-container">` with `perf-bar-row` elements.

---

#### `convertComparisonBarsToHtml(html: string): string`

Converts comparison benchmark bars with estimated/volatile indicators.

**Detection:** Pattern `+40% (est.) ======== Label text` -- all lines must match, minimum 2.

**Features:**
- Distinguishes between estimated values (`(est.)` suffix -- gradient fade), confirmed values (solid fill), and volatile items (amber shimmer)
- Volatile detection: `+/-` notation or `vol.` in label
- Displays badges for estimated and volatile entries
- Replaces `+/-` with `&plusmn;` entity

**Output:** `<div class="comp-bars-container">` with `comp-bar-row` elements using `--row-index` CSS variable for staggered animations.

---

#### `convertScatterPlotsToHtml(html: string): string`

Converts ASCII scatter plots (risk-return charts) to styled interactive scatter plots.

**Detection:** Requires:
1. An axis line matching `L___` or `+---` pattern
2. Lines with `:` separator containing `*` or `o` markers above the axis

**Features:**
- Parses Y-axis labels from `\d+% :` patterns
- Parses X-axis labels from `\d+%` patterns on the line after the axis
- Interpolates data point X/Y positions from character positions relative to axis labels
- `*` markers are highlighted, `o` markers are standard
- Generates horizontal and vertical grid lines
- Extracts X-axis title from line below X-axis labels

**Output:** A full `scatter-plot-container` with:
- Y-axis label column
- Plot area with grid lines and positioned data points
- X-axis labels and title

---

#### `convertAllocationProfilesToHtml(html: string): string`

Converts allocation profile boxes drawn with box-drawing characters into styled allocation cards.

**Detection:** Requires `\u256d` character AND one of: `DECOUVERTE`, `CONFIRME`, or `EXPERT` profile titles.

**Features:**
- Splits on box-drawing top border `\u256d\u2500\u2500\u2500...\u256e`
- Parses profile title, allocation categories with percentages, and focus artists
- Generates progress bars for each allocation percentage

**Output:** `<div class="allocation-profiles">` with `allocation-card` elements containing allocation items with progress bars and optional focus artist tags.

---

## 5. `constants/portfolio-tiers.ts` -- Portfolio Tier Definitions

**File:** `src/lib/constants/portfolio-tiers.ts`

**Purpose:** Defines the investment portfolio tiers for each agent level. Used by `PortfolioMenu` component to display tier options.

### Exports

Each export is an array of `{ label: string; value: string }` objects.

#### `DISCOVER_PORTFOLIO_TIERS` (10 tiers, 1k-30k range)

| Label | Value |
|---|---|
| 1k-3k NEOPHYTE | `1k-3k_NEOPHYTE` |
| 3k-5k DEBUTANT | `3k-5k_DEBUTANT` |
| 6k-8k ECLAIRE | `6k-8k_ECLAIRE` |
| 8k-10k AVERTI | `8k-10k_AVERTI` |
| 10k-13k CONFIRME | `10k-13k_CONFIRME` |
| 13k-16k AGUERRI | `13k-16k_AGUERRI` |
| 16k-19k CHEVRONNE | `16k-19k_CHEVRONNE` |
| 19k-21k ACCOMPLI | `19k-21k_ACCOMPLI` |
| 21k-25k EMINENT | `21k-25k_EMINENT` |
| 25k-30k VIRTUOSE | `25k-30k_VIRTUOSE` |

#### `INTELLIGENCE_PORTFOLIO_TIERS` (10 tiers, 30k-150k range)

| Label | Value |
|---|---|
| 30k-35k STRATEGE | `30k-35k_STRATEGE` |
| 35k-40k VISIONNAIRE | `35k-40k_VISIONNAIRE` |
| 40k-50k ARCHITECTE | `40k-50k_ARCHITECTE` |
| 50k-60k BATISSEUR | `50k-60k_BATISSEUR` |
| 60k-70k INFLUENT | `60k-70k_INFLUENT` |
| 70k-80k DECIDEUR | `70k-80k_DECIDEUR` |
| 80k-90k DIRIGEANT | `80k-90k_DIRIGEANT` |
| 90k-100k GOUVERNEUR | `90k-100k_GOUVERNEUR` |
| 100k-120k REGENT | `100k-120k_REGENT` |
| 120k-150k SOUVERAIN | `120k-150k_SOUVERAIN` |

#### `ORACLE_PORTFOLIO_TIERS` (10 tiers, 150k-500M range)

| Label | Value |
|---|---|
| 150k-300k PATRIMOINE | `150k-300k_PATRIMOINE` |
| 300k-600k DYNASTIE | `300k-600k_DYNASTIE` |
| 600k-1M EMPIRE | `600k-1M_EMPIRE` |
| 1M-5M MAGNAT | `1M-5M_MAGNAT` |
| 5M-10M TITAN | `5M-10M_TITAN` |
| 10M-50M LEGENDE | `10M-50M_LEGENDE` |
| 50M-75M OLYMPIEN | `50M-75M_OLYMPIEN` |
| 75M-100M IMMORTEL | `75M-100M_IMMORTEL` |
| 100M-200M PANTHEON | `100M-200M_PANTHEON` |
| 200M-500M ABSOLU | `200M-500M_ABSOLU` |

---

## 6. `constants/flashcards.ts` -- Flashcard Category Mapping

**File:** `src/lib/constants/flashcards.ts`

**Purpose:** Maps display category names to API enum values used when requesting flashcard/ranking content from the backend.

### Export

```typescript
export const FLASHCARD_MAPPING: Record<
  string,
  { flash_cards: string; question: string }
>
```

### Values

| Display Name | `flash_cards` / `question` value |
|---|---|
| `"Contemporary Art"` | `"art"` |
| `"Contemp. Art"` | `"art"` |
| `"Prestigious Wines"` | `"wine"` |
| `"Luxury Bags"` | `"sacs"` |
| `"Precious Jewelry"` | `"bijoux"` |
| `"Luxury Watch"` | `"montres_luxe"` |
| `"Collectible Cars"` | `"cars"` |
| `"Limited Sneakers"` | `"sneakers"` |
| `"Rare Whiskey"` | `"whisky"` |
| `"Real Estate"` | `"immo_luxe"` |
| `"US sports cards"` | `"cards_us"` |

Note: `"Contemporary Art"` and `"Contemp. Art"` both map to `"art"`, accommodating both full and abbreviated display names.

---

## 7. `supabase/client.ts` -- Public Supabase Client

**File:** `src/lib/supabase/client.ts`

**Purpose:** Creates a singleton Supabase client using the public anon key. Safe for client-side use, subject to RLS policies.

### Export

```typescript
export const supabase: SupabaseClient<Database>
```

**Implementation:**

```typescript
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

**Environment variables required:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 8. `supabase/admin.ts` -- Admin Supabase Client

**File:** `src/lib/supabase/admin.ts`

**Purpose:** Creates a Supabase client with service role privileges that **bypasses Row Level Security (RLS)**. Server-side only.

### Export

```typescript
export function createAdminClient(): SupabaseClient<Database>
```

**Implementation:**

```typescript
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set in environment variables");
  }
  if (!supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set in environment variables");
  }

  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
```

**Key differences from public client:**
- Uses `SUPABASE_SERVICE_ROLE_KEY` instead of anon key
- Disables `autoRefreshToken` and `persistSession` (no session management needed for service role)
- Throws explicit errors if environment variables are missing (rather than using `!` assertion)
- Returns a new client on each call (factory function, not singleton)

**Environment variables required:** `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

---

## 9. `supabase/server.ts` -- Server-Side Supabase Client

**File:** `src/lib/supabase/server.ts`

**Purpose:** Creates a Supabase client for server-side use with the anon key (respects RLS, unlike the admin client).

### Export

```typescript
export function createServerClient(): SupabaseClient<Database>
```

**Implementation:**

```typescript
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set in environment variables");
  }
  if (!supabaseAnonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set in environment variables");
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}
```

**Difference from `client.ts`:** Factory function (creates new client per call) with explicit env var validation. Same anon key, same RLS enforcement. Intended for API routes and server components where the singleton from `client.ts` should not be reused.

---

## 10. `supabase/storage.ts` -- File Upload/Delete with Retry

**File:** `src/lib/supabase/storage.ts`

**Purpose:** Client-side file upload and deletion via the `/api/upload` API route, with retry logic and exponential backoff.

### Interfaces

```typescript
export interface UploadedFile {
  name: string;
  size: number;
  type: string;
  url: string;
  path: string;
}
```

### Functions

#### `uploadFile`

```typescript
export async function uploadFile(
  file: File,
  userId: string,
  conversationId: number | null,
  onProgress?: (progress: number) => void
): Promise<UploadedFile>
```

Uploads a file via `POST /api/upload` using `FormData`. The `onProgress` callback parameter is declared but not currently wired to actual progress events (the upload uses a single `fetch` call).

**Throws** on non-OK response or invalid response shape.

#### `deleteFile`

```typescript
export async function deleteFile(path: string): Promise<void>
```

Deletes a file via `DELETE /api/upload` with a JSON body containing the `path`.

#### `uploadWithRetry`

```typescript
export async function uploadWithRetry(
  file: File,
  userId: string,
  conversationId: number | null,
  maxRetries?: number,      // default: 3
  onProgress?: (progress: number) => void
): Promise<UploadedFile>
```

Wraps `uploadFile` with exponential backoff retry:

```typescript
// Retry delay calculation:
const delay = Math.pow(2, attempt) * 1000;
// attempt 0: 1s, attempt 1: 2s, attempt 2: 4s
```

Throws the last error if all retries are exhausted.

---

## 11. `supabase/profiles.ts` -- User Profile Operations

**File:** `src/lib/supabase/profiles.ts`

**Purpose:** Upserts user profiles in the Supabase `profiles` table. Used during authentication callbacks to create or update user records.

### Interfaces

```typescript
interface UpsertProfileParams {
  id: string;
  email: string;
  username?: string;
  avatarUrl?: string | null;
  firstName?: string;
  lastName?: string;
  status?: UserStatus;        // defaults to "oracle"
}
```

### Function

```typescript
export async function upsertProfile(
  adminClient: SupabaseClient<Database>,
  params: UpsertProfileParams,
): Promise<string | null>    // returns profile ID or null on failure
```

**Upsert logic (three-phase lookup):**

1. **Check by email:** Query `profiles` where `mail = email`. If found, update the existing row with the provided fields and return its `id`.
2. **Check by id:** Query `profiles` where `id = id`. If found, update the row (also setting `mail = email`) and return the `id`.
3. **Insert new:** Insert a new profile row with all provided fields. Username defaults to the email prefix (`email.split("@")[0]`) if not provided.

**Default status:** `"oracle"` (highest tier). This means newly created profiles get full agent access by default.

**Update fields:** Only non-`undefined` fields are included in the update payload. The `updated_at` timestamp is always set to `new Date().toISOString()`.

---

## 12. `supabase/types.ts` -- Auto-Generated Database Types

**File:** `src/lib/supabase/types.ts`

**Purpose:** Auto-generated TypeScript types matching the Supabase database schema. Provides full type safety for all database operations.

### Database Schema

#### Enums

```typescript
message_sender: "user" | "ai"

user_status: "unauthorized" | "free" | "paid" | "admini" | "discover" | "intelligence" | "oracle"
```

#### Tables

##### `profiles`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | `string` | No | Primary key |
| `mail` | `string` | Yes | |
| `username` | `string` | Yes | |
| `avatar_url` | `string` | Yes | |
| `first_name` | `string` | Yes | |
| `last_name` | `string` | Yes | |
| `is_admin` | `boolean` | No | |
| `status` | `user_status` | No | |
| `updated_at` | `string` | Yes | |

##### `conversations`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | `number` | No | Auto-increment PK |
| `user_id` | `string` | No | FK -> `profiles.id` |
| `title` | `string` | Yes | |
| `model` | `string` | Yes | |
| `created_at` | `string` | Yes | |
| `updated_at` | `string` | Yes | |

##### `messages`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | `number` | No | Auto-increment PK |
| `conversation_id` | `number` | No | FK -> `conversations.id` |
| `content` | `string` | No | |
| `sender` | `message_sender` | No | `"user"` or `"ai"` |
| `metadata` | `Json` | Yes | |
| `created_at` | `string` | Yes | |

##### `message_usage`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | `number` | No | Auto-increment PK |
| `message_id` | `number` | No | FK -> `messages.id` (one-to-one) |
| `model_name` | `string` | Yes | |
| `prompt_tokens` | `number` | Yes | |
| `completion_tokens` | `number` | Yes | |
| `total_tokens` | `number` | Yes | |
| `estimated_cost` | `number` | Yes | |
| `created_at` | `string` | Yes | |

##### `conversation_shares`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | `number` | No | Auto-increment PK |
| `conversation_id` | `number` | No | FK -> `conversations.id` |
| `created_by` | `string` | No | FK -> `profiles.id` |
| `share_token` | `string` | No | |
| `expires_at` | `string` | Yes | |
| `created_at` | `string` | Yes | |

### Utility Types

```typescript
// Extract Row type for a table
export type Tables<TableName> = ...  // e.g., Tables<"profiles"> gives the Row type

// Extract Insert type for a table
export type TablesInsert<TableName> = ...

// Extract Update type for a table
export type TablesUpdate<TableName> = ...

// Extract Enum values
export type Enums<EnumName> = ...

// Extract CompositeType (currently none defined)
export type CompositeTypes<TypeName> = ...
```

### Additional Exports

```typescript
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export const Constants = {
  public: {
    Enums: {
      message_sender: ["user", "ai"],
      user_status: ["unauthorized", "free", "paid", "admini", "discover", "intelligence", "oracle"],
    },
  },
} as const;

export interface FileAttachment {
  url: string;
  name: string;
  size: number;
  type: string;
  path?: string;
}
```

---

## 13. `utils/fileValidation.ts` -- File Validation Utilities

**File:** `src/lib/utils/fileValidation.ts`

**Purpose:** File validation, sanitization, and formatting utilities used by the file upload flow.

### Constants

```typescript
export const MAX_FILE_SIZE = 50 * 1024 * 1024;  // 50MB
export const MAX_FILES = 10;
```

### Interfaces

```typescript
export interface ValidationResult {
  valid: boolean;
  error?: string;
}
```

### Functions

#### `validateFile`

```typescript
export function validateFile(file: File): ValidationResult
```

Validates a single file:
- Rejects files exceeding `MAX_FILE_SIZE` (50MB) with message: `"<name> exceeds the 50MB size limit"`
- Rejects empty files (0 bytes) with message: `"<name> is empty"`
- No MIME type restriction -- all file types are accepted

#### `validateFiles`

```typescript
export function validateFiles(files: File[]): ValidationResult
```

Validates an array of files:
- Rejects empty arrays: `"No files selected"`
- Rejects arrays exceeding `MAX_FILES` (10): `"You can only upload up to 10 files at once"`
- Runs `validateFile` on each file, returning the first failure

#### `sanitizeFilename`

```typescript
export function sanitizeFilename(filename: string): string
```

Replaces all characters except `a-zA-Z0-9._-` with underscores:

```typescript
return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
// "my file (2).pdf" -> "my_file__2_.pdf"
```

#### `formatFileSize`

```typescript
export function formatFileSize(bytes: number): string
```

Human-readable file size formatting:

```typescript
// Examples:
formatFileSize(0)           // "0 B"
formatFileSize(1024)        // "1.0 KB"
formatFileSize(1536)        // "1.5 KB"
formatFileSize(1048576)     // "1.0 MB"
formatFileSize(1073741824)  // "1.0 GB"
```

#### `getFileExtension`

```typescript
export function getFileExtension(filename: string): string
```

Returns the lowercase file extension (without the dot), or empty string if none:

```typescript
getFileExtension("photo.JPG")     // "jpg"
getFileExtension("archive.tar.gz") // "gz"
getFileExtension("noextension")    // ""
```

#### `getFileType`

```typescript
export function getFileType(mimeType: string): 'image' | 'document' | 'video' | 'audio' | 'archive' | 'other'
```

Categorizes a MIME type into a broad file type:

| Category | MIME type patterns |
|---|---|
| `image` | starts with `image/` |
| `video` | starts with `video/` |
| `audio` | starts with `audio/` |
| `document` | contains `pdf`, `document`, `text`, `msword`, `spreadsheet`, or `presentation` |
| `archive` | contains `zip`, `rar`, `tar`, or `compressed` |
| `other` | everything else |
