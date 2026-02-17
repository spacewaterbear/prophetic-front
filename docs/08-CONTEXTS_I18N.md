# 08 - Contexts & Internationalization

This document covers the two React context providers used in Prophetic Orchestra: **SidebarContext** for sidebar/mobile layout state and **I18nContext** for internationalization. Both are defined under `src/contexts/` and wrapped around the application in the root providers.

---

## Table of Contents

1. [SidebarContext](#sidebarcontext)
2. [I18nContext](#i18ncontext)
3. [Translation System](#translation-system)
4. [Supported Languages](#supported-languages)
5. [Translation Key Structure](#translation-key-structure)
6. [How to Add New Translations](#how-to-add-new-translations)

---

## SidebarContext

**File:** `src/contexts/sidebar-context.tsx`

Manages the sidebar open/close state and tracks whether the viewport is mobile-sized. Used throughout the chat layout to toggle the sidebar and conditionally render mobile-specific UI.

### Interface

```typescript
interface SidebarContextType {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isMobile: boolean;
}
```

| Property | Type | Description |
|----------|------|-------------|
| `sidebarOpen` | `boolean` | Whether the sidebar is currently visible. Defaults to `true` on desktop (>= 768px), `false` on mobile. |
| `setSidebarOpen` | `(open: boolean) => void` | Setter to programmatically open or close the sidebar. |
| `isMobile` | `boolean` | `true` when `window.innerWidth < 768`, `false` otherwise. |

### Provider: `SidebarProvider`

```typescript
export function SidebarProvider({ children }: { children: React.ReactNode })
```

Wraps child components with the `SidebarContext.Provider`. On mount, it reads the initial window width and sets state accordingly. It also attaches a `resize` event listener that continuously updates both `sidebarOpen` and `isMobile` when the viewport changes.

**Mobile detection logic:**

```typescript
useEffect(() => {
  const isDesktop = window.innerWidth >= 768;
  setSidebarOpen(isDesktop);
  setIsMobile(!isDesktop);

  const handleResize = () => {
    const isDesktop = window.innerWidth >= 768;
    setSidebarOpen(isDesktop);
    setIsMobile(!isDesktop);
  };

  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}, []);
```

Key behavior:
- The breakpoint is **768px** (matches Tailwind's `md` breakpoint).
- On desktop, the sidebar opens by default. On mobile, it starts closed.
- Every resize event recalculates both values, meaning resizing the browser window will automatically toggle the sidebar.
- The resize listener is properly cleaned up on unmount.

### Hook: `useSidebar`

```typescript
export function useSidebar(): SidebarContextType
```

Returns the current `SidebarContextType` value. Throws an error if called outside of a `SidebarProvider`:

```
"useSidebar must be used within a SidebarProvider"
```

### Usage Example

```tsx
import { useSidebar } from "@/contexts/sidebar-context";

function MyComponent() {
  const { sidebarOpen, setSidebarOpen, isMobile } = useSidebar();

  return (
    <div>
      {isMobile && (
        <button onClick={() => setSidebarOpen(!sidebarOpen)}>
          Toggle Sidebar
        </button>
      )}
      {sidebarOpen && <Sidebar />}
    </div>
  );
}
```

---

## I18nContext

**File:** `src/contexts/i18n-context.tsx`

Provides internationalization (i18n) across the application. Manages the active language, auto-detects the user's language via a geolocation API, and exposes a translation function `t()` for looking up translated strings by dot-notation keys.

This is a `"use client"` component.

### Interface

```typescript
interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}
```

| Property | Type | Description |
|----------|------|-------------|
| `language` | `Language` | The currently active language code (e.g., `"fr"`, `"en"`, `"ja"`). |
| `setLanguage` | `(lang: Language) => void` | Setter to change the active language programmatically. |
| `t` | `(key: string) => string` | Translation function. Accepts a dot-notation key (e.g., `"chat.greeting"`) and returns the translated string. |

### Provider: `I18nProvider`

```typescript
export function I18nProvider({ children }: { children: React.ReactNode })
```

Wraps child components with `I18nContext.Provider`. The provider initializes with French (`"fr"`) as the default language and immediately kicks off geolocation-based language detection on mount.

### Language Detection Flow

The language detection follows this sequence:

```
1. Component mounts with default language: "fr"
         |
2. useEffect fires: fetches GET /api/geolocation
         |
    +-----+------+
    |              |
  Success        Failure
    |              |
3a. Extracts     3b. Keeps default "fr"
    data.language     (console.error logged)
    from response
    |
4. Sets language via setLanguage()
   Logs: "[I18n] Language detected: XX from country: YY"
```

**Detection code:**

```typescript
useEffect(() => {
  const fetchGeolocation = async () => {
    try {
      const response = await fetch("/api/geolocation");
      if (response.ok) {
        const data = await response.json();
        const detectedLang = data.language || "fr";
        setLanguage(detectedLang as Language);
        console.log("[I18n] Language detected:", detectedLang, "from country:", data.country);
      }
    } catch (error) {
      console.error("[I18n] Error fetching geolocation:", error);
      // Keep default French on error
    }
  };

  fetchGeolocation();
}, []);
```

Key behavior:
- The `/api/geolocation` endpoint returns `{ language: string, country: string }` based on the user's IP.
- If the API call fails or the response is not OK, the language stays at `"fr"` (French).
- If the API returns a language not in the `Language` type, it will be set but may not have translations (falling back to English or the key itself).
- This runs once on mount (empty dependency array).

### The `t()` Translation Function

The `t()` function is a thin wrapper around `getTranslation()` from `src/lib/translations.ts`:

```typescript
const t = (key: string): string => {
  return getTranslation(language, key);
};
```

It accepts dot-notation keys and traverses the nested translation object. See the [Translation System](#translation-system) section for full details.

### Hook: `useI18n`

```typescript
export function useI18n(): I18nContextType
```

Returns the current `I18nContextType` value. Throws an error if called outside of an `I18nProvider`:

```
"useI18n must be used within an I18nProvider"
```

### Usage Example

```tsx
import { useI18n } from "@/contexts/i18n-context";

function LoginPage() {
  const { t, language, setLanguage } = useI18n();

  return (
    <div>
      <h1>{t("login.welcome")}</h1>
      <p>{t("login.subtitle")}</p>
      <button>{t("login.continueWithGoogle")}</button>

      {/* Manual language override */}
      <select value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
        <option value="fr">Francais</option>
        <option value="en">English</option>
      </select>
    </div>
  );
}
```

---

## Translation System

**File:** `src/lib/translations.ts`

### Exported Types

```typescript
// Union of all supported language codes, derived from the translations object keys
export type Language = keyof typeof translations;
// Resolves to: "fr" | "en" | "es" | "de" | "it" | "pt" | "nl" | "ja" | "zh"

// Alias for string (used for documentation intent, not strict type checking)
export type TranslationKey = string;
```

### The `translations` Object

The main `translations` constant is a deeply nested readonly object (`as const`) keyed by language code. Each language contains the same nested structure of translation groups and keys.

```typescript
export const translations = {
  fr: { nav: { ... }, chat: { ... }, login: { ... }, contextMenu: { ... }, common: { ... } },
  en: { ... },
  es: { ... },
  // ... all 9 languages
} as const;
```

### The `getTranslation()` Function

```typescript
export function getTranslation(
  lang: Language,
  key: string,
  fallbackLang: Language = "en"
): string
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `lang` | `Language` | (required) | The target language to look up. |
| `key` | `string` | (required) | Dot-notation key path (e.g., `"chat.greeting"`). |
| `fallbackLang` | `Language` | `"en"` | Language to try if the key is not found in `lang`. |

**Resolution algorithm:**

1. Split the key by `"."` into path segments.
2. Traverse `translations[lang]` following the path segments.
3. If at any point a segment is not found:
   - Restart traversal from `translations[fallbackLang]` (English by default).
   - If the key is also missing in the fallback language, return the raw key string itself.
4. If the final resolved value is a string, return it. Otherwise, return the raw key string.

**Examples:**

```typescript
getTranslation("fr", "chat.greeting");      // "Bonjour, {name}"
getTranslation("en", "chat.greeting");      // "Hello, {name}"
getTranslation("ja", "common.save");        // "保存"
getTranslation("fr", "nonexistent.key");    // "nonexistent.key" (key returned as-is)
getTranslation("es", "login.firstName");    // Falls back to English: "First name"
```

Note: String interpolation (e.g., `{name}` in `"Bonjour, {name}"`) is **not** handled by `getTranslation()`. The calling component must perform its own string replacement after receiving the translated template.

---

## Supported Languages

| Code | Language | Example Greeting |
|------|----------|-----------------|
| `fr` | French (default) | `"Bonjour, {name}"` |
| `en` | English (fallback) | `"Hello, {name}"` |
| `es` | Spanish | `"Hola"` |
| `de` | German | `"Hallo"` |
| `it` | Italian | `"Ciao"` |
| `pt` | Portuguese | `"Ola"` |
| `nl` | Dutch | `"Hallo"` |
| `ja` | Japanese | `"こんにちは"` |
| `zh` | Chinese (Simplified) | `"你好"` |

- **Default language** (before geolocation resolves): French (`"fr"`)
- **Fallback language** (when a key is missing): English (`"en"`)

---

## Translation Key Structure

All languages share the same nested key structure organized into five groups:

### `nav` -- Navigation / Sidebar

| Key | English Value | Description |
|-----|--------------|-------------|
| `nav.newChat` | `"New Chat"` | New conversation button label |
| `nav.recentChats` | `"Recent Chats"` | Sidebar section header |
| `nav.signOut` | `"Sign Out"` | Sign out button label |
| `nav.noConversations` | `"No conversations yet"` | Empty conversation list message |

### `chat` -- Chat Interface

| Key | English Value | Description |
|-----|--------------|-------------|
| `chat.greeting` | `"Hello, {name}"` | Welcome greeting (supports `{name}` interpolation in `fr` and `en`) |
| `chat.welcomeMessage` | `"How can I help you invest wisely?"` | Welcome screen main message |
| `chat.welcomeSubtitle` | `"How can I help you invest wisely?"` | Welcome screen subtitle (present in `fr` and `en`) |
| `chat.placeholder` | `"How can I help you invest wisely?"` | Chat input placeholder text |
| `chat.send` | `"Send"` | Send button label |
| `chat.comingSoon` | `"coming soon"` | Coming soon badge text |
| `chat.loading` | `"Loading..."` | Generic loading indicator |
| `chat.loadingMarketplace` | `"Loading marketplace data..."` | Marketplace data loading message |
| `chat.loadingRealEstate` | `"Loading real estate data..."` | Real estate data loading message |

### `login` -- Login & Registration Page

| Key | English Value | Description |
|-----|--------------|-------------|
| `login.welcome` | `"Welcome"` | Login page heading |
| `login.subtitle` | `"Sign in to access your luxury investment insights"` | Login page subheading |
| `login.continueWithGoogle` | `"Continue with Google"` | Google OAuth button |
| `login.secureAuth` | `"Secure Authentication"` | Security badge label |
| `login.termsText` | `"By signing in, you agree to..."` | Terms of service notice |
| `login.encryption` | `"256-bit Encryption"` | Security feature label |
| `login.certified` | `"SOC 2 Certified"` | Certification badge |
| `login.orContinueWith` | `"or continue with"` | Divider text between auth methods |
| `login.emailPlaceholder` | `"Enter your email address"` | Magic link email input placeholder |
| `login.sendMagicLink` | `"Send magic link"` | Magic link send button |
| `login.sending` | `"Sending..."` | Send button loading state |
| `login.magicLinkSent` | `"Magic link sent!"` | Success message after sending |
| `login.checkEmail` | `"Check your inbox and click the link to sign in."` | Post-send instructions |
| `login.invalidEmail` | `"Please enter a valid email address"` | Validation error message |
| `login.sendError` | `"Failed to send. Please try again."` | Network error message |
| `login.tryAgain` | `"Try again"` | Retry button label |
| `login.completeRegistration` | `"Complete your registration"` | Registration form heading (present in `fr` and `en`) |
| `login.completeRegistrationSubtitle` | `"Please enter your information to continue"` | Registration form subtitle (present in `fr` and `en`) |
| `login.firstName` | `"First name"` | First name field label (present in `fr` and `en`) |
| `login.lastName` | `"Last name"` | Last name field label (present in `fr` and `en`) |
| `login.firstNamePlaceholder` | `"Enter your first name"` | First name input placeholder (present in `fr` and `en`) |
| `login.lastNamePlaceholder` | `"Enter your last name"` | Last name input placeholder (present in `fr` and `en`) |
| `login.createAccount` | `"Create my account"` | Account creation button (present in `fr` and `en`) |
| `login.creating` | `"Creating..."` | Account creation loading state (present in `fr` and `en`) |

### `contextMenu` -- Text Selection Context Menu

| Key | English Value | Description |
|-----|--------------|-------------|
| `contextMenu.deepSearch` | `"Make a deep search about it"` | Context menu action for deep search |

### `common` -- Shared / Generic Strings

| Key | English Value | Description |
|-----|--------------|-------------|
| `common.loading` | `"Loading..."` | Generic loading text |
| `common.error` | `"Error"` | Error label |
| `common.success` | `"Success"` | Success label |
| `common.cancel` | `"Cancel"` | Cancel button |
| `common.confirm` | `"Confirm"` | Confirm button |
| `common.delete` | `"Delete"` | Delete button |
| `common.edit` | `"Edit"` | Edit button |
| `common.save` | `"Save"` | Save button |

---

## How to Add New Translations

### Step 1: Add the key to all language entries

Open `src/lib/translations.ts` and add the new key under the appropriate group in **every** language object. At minimum, add it to `fr` (default) and `en` (fallback).

For example, to add a "copy" action to the `common` group:

```typescript
// In src/lib/translations.ts
export const translations = {
  fr: {
    // ...
    common: {
      // ... existing keys
      copy: "Copier",
    },
  },
  en: {
    // ...
    common: {
      // ... existing keys
      copy: "Copy",
    },
  },
  es: {
    common: {
      // ... existing keys
      copy: "Copiar",
    },
  },
  // ... repeat for de, it, pt, nl, ja, zh
} as const;
```

### Step 2: Use the key in a component

```tsx
const { t } = useI18n();

return <button>{t("common.copy")}</button>;
```

### Step 3: Add a new translation group (optional)

To create an entirely new group (e.g., `portfolio`), add the group object under every language:

```typescript
fr: {
  // ... existing groups
  portfolio: {
    title: "Mon Portefeuille",
    empty: "Aucun actif dans votre portefeuille",
  },
},
en: {
  portfolio: {
    title: "My Portfolio",
    empty: "No assets in your portfolio",
  },
},
// ... all other languages
```

Then reference with `t("portfolio.title")`.

### Step 4: Add a new language (optional)

1. Add a new language object to the `translations` constant with all existing keys translated:

```typescript
export const translations = {
  // ... existing languages
  ko: {
    nav: { newChat: "새 채팅", /* ... */ },
    chat: { greeting: "안녕하세요", /* ... */ },
    // ... all groups
  },
} as const;
```

2. The `Language` type is automatically derived from the object keys, so `"ko"` will be included in the union type without any additional type changes.

3. Update the `/api/geolocation` endpoint to map the relevant country codes to the new language code.

### Important Notes

- The `as const` assertion on the translations object ensures TypeScript treats all values as literal types.
- If a key is missing for a non-English language, `getTranslation()` will automatically fall back to the English value.
- If a key is missing from both the target language and English, the raw dot-notation key string is returned (e.g., `"portfolio.title"`). This makes missing translations easy to spot in the UI.
- Some keys (notably `login.completeRegistration`, `login.firstName`, `login.lastName`, etc.) are only defined in `fr` and `en`. Other languages will fall back to the English value for these keys.
- String interpolation tokens like `{name}` in `chat.greeting` must be handled manually by the consuming component. The translation system does not process them.
