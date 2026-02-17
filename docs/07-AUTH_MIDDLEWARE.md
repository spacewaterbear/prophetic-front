# 07 - Authentication & Middleware

## Table of Contents

1. [Overview](#overview)
2. [NextAuth Configuration](#nextauth-configuration)
   - [Providers](#providers)
   - [Cookie Configuration](#cookie-configuration)
   - [Callbacks](#callbacks)
   - [Session Strategy](#session-strategy)
3. [Session Types and Extensions](#session-types-and-extensions)
4. [User Statuses](#user-statuses)
5. [Agent Access by Status](#agent-access-by-status)
6. [Middleware Route Protection](#middleware-route-protection)
   - [Route Classification](#route-classification)
   - [Decision Flow Diagram](#decision-flow-diagram)
   - [Environment-Based Access Control](#environment-based-access-control)
   - [Matcher Configuration](#matcher-configuration)
7. [Google OAuth Flow](#google-oauth-flow)
   - [ID-to-UUID Mapping](#id-to-uuid-mapping)
   - [Profile Upsert on Sign-In](#profile-upsert-on-sign-in)
8. [Magic Link Flow](#magic-link-flow)
   - [Step 1: Sending the Magic Link](#step-1-sending-the-magic-link)
   - [Step 2: Callback Processing on the Login Page](#step-2-callback-processing-on-the-login-page)
   - [Step 3: Profile Check](#step-3-profile-check)
   - [Step 4: New User Registration](#step-4-new-user-registration)
   - [Step 5: NextAuth Credentials Sign-In](#step-5-nextauth-credentials-sign-in)
9. [Login Page Implementation](#login-page-implementation)
10. [Profile Upsert Logic](#profile-upsert-logic)
11. [Key Files Reference](#key-files-reference)

---

## Overview

Prophetic Orchestra uses **NextAuth v5** (Auth.js) for authentication, with two providers:

- **Google OAuth** -- primary sign-in method with automatic profile creation.
- **Magic Link** (email OTP via Supabase Auth) -- passwordless email authentication with a registration step for new users.

User profiles are stored in a Supabase `profiles` table. The middleware layer enforces route protection, environment-based access gating (staging/preprod restricted to admins), and status-based authorization.

---

## NextAuth Configuration

**File:** `src/auth.ts`

The NextAuth instance is created with `NextAuth()` and exports four artifacts:

```typescript
export const { handlers, signIn, signOut, auth } = NextAuth({ ... });
```

- `handlers` -- GET/POST route handlers exposed at `/api/auth/[...nextauth]/route.ts`
- `signIn` / `signOut` -- server-side sign-in/sign-out functions
- `auth` -- the auth middleware wrapper used in `middleware.ts`

### Providers

#### Google OAuth

```typescript
Google({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  authorization: {
    params: {
      prompt: "consent",
      access_type: "offline",
      response_type: "code",
    },
  },
})
```

Key details:
- Forces consent screen on every sign-in (`prompt: "consent"`).
- Requests offline access for refresh tokens (`access_type: "offline"`).
- Uses authorization code flow (`response_type: "code"`).

#### Magic Link (Credentials Provider)

```typescript
Credentials({
  id: "magic-link",
  name: "Magic Link",
  credentials: {
    accessToken: { label: "Access Token", type: "text" },
    refreshToken: { label: "Refresh Token", type: "text" },
  },
  async authorize(credentials) {
    // Creates a Supabase client, sets session with the provided tokens,
    // verifies the user, and returns a user object.
  },
})
```

The magic link provider does not send emails itself. It receives Supabase access/refresh tokens (obtained from the Supabase OTP flow) and verifies them. The `authorize` function:

1. Creates a Supabase client with the public anon key.
2. Calls `supabase.auth.setSession()` with the access and refresh tokens.
3. If verification succeeds, returns `{ id: user.id, email: user.email, name: ... }`.
4. If verification fails, returns `null` (authentication rejected).

### Cookie Configuration

The configuration uses secure cookies in production with PKCE code verifier, state, and nonce cookies:

```typescript
useSecureCookies: process.env.NODE_ENV === "production",
cookies: {
  pkceCodeVerifier: {
    name: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}authjs.pkce.code_verifier`,
    options: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 15, // 15 minutes
    },
  },
  // Same pattern for `state` and `nonce` cookies
}
```

All three cookies (pkceCodeVerifier, state, nonce) share the same options: `httpOnly`, `sameSite: "lax"`, 15-minute TTL, and `__Secure-` prefix in production.

### Callbacks

#### `jwt` Callback

Runs whenever a JWT token is created or refreshed. Responsible for mapping provider-specific user IDs to a stable internal UUID.

```typescript
async jwt({ token, account, profile, user }) {
  // 1. Magic link: user.id is already the Supabase user ID
  if (account?.provider === "magic-link" && user) {
    token.userId = user.id;
    token.email = user.email;
    token.provider = "magic-link";
    return token;
  }

  // 2. Google first sign-in: look up existing profile by email or generate UUID
  if (account && profile && user.email) {
    token.googleId = account.providerAccountId;
    token.provider = "google";

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("mail", user.email)
      .maybeSingle();

    if (existingProfile) {
      token.userId = existingProfile.id;  // reuse existing profile ID
    } else {
      token.userId = await googleIdToUuid(account.providerAccountId);
    }
  }

  // 3. Token refresh: regenerate userId from stored googleId if needed
  if (!token.userId && token.googleId) {
    token.userId = await googleIdToUuid(token.googleId as string);
  }

  return token;
}
```

Important: The callback explicitly avoids using `token.sub` (NextAuth's internal ID) for user identification, instead storing a deterministic UUID derived from the Google provider account ID.

#### `signIn` Callback

Handles profile creation/update in Supabase on each sign-in.

```typescript
async signIn({ user, account, profile }) {
  // Magic link: profile already created via /api/auth/magiclink/callback
  if (account?.provider === "magic-link") {
    return true;
  }

  // Google: auto-create/update profile
  if (googleId && user.email) {
    const userId = await googleIdToUuid(googleId);
    await upsertProfile(supabase, {
      id: userId,
      email: user.email,
      username: user.name || user.email.split("@")[0],
      avatarUrl: user.image ?? null,
      status: "oracle",  // default status for new Google users
    });
  }
  return true;
}
```

Note: New Google users are created with `status: "oracle"` by default.

#### `session` Callback

Enriches the session object with the stable user ID and the user's status from the database.

```typescript
async session({ session, token }) {
  session.user.id = token.userId as string;

  // Fetch status from profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('status')
    .eq('id', session.user.id)
    .maybeSingle();

  if (profile) {
    session.user.status = profile.status;
  }

  return session;
}
```

### Session Strategy

NextAuth v5 uses JWT-based sessions by default (no `strategy` is explicitly set, so it defaults to `"jwt"`). The JWT is stored in an HTTP-only cookie. The session callback runs on every `auth()` call to hydrate the session with fresh profile data.

Custom sign-in page is configured:

```typescript
pages: {
  signIn: "/login",
}
```

Additional settings:
- `secret: process.env.AUTH_SECRET`
- `trustHost: true` (required for reverse proxy deployments)

---

## Session Types and Extensions

**File:** `src/types/next-auth.d.ts`

The default NextAuth types are augmented to include `status` and `isAdmin` on both `Session["user"]` and `User`:

```typescript
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

---

## User Statuses

**File:** `src/types/agents.ts`

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

| Status | Meaning |
|--------|---------|
| `unauthorized` | Authenticated but not yet approved. Redirected to `/registration-pending`. |
| `free` | Free-tier user. Mapped to `discover` access level internally. |
| `paid` | Legacy paid status. Treated as authorized. |
| `discover` | Discover-tier subscription. Access to the Discover agent only. |
| `intelligence` | Intelligence-tier subscription. Access to Discover + Intelligence agents. |
| `oracle` | Oracle-tier subscription. Full access to all three agents. |
| `admini` | Administrator. Full access to all agents plus admin-only features (model selector, staging/preprod environments). |

---

## Agent Access by Status

**File:** `src/types/agents.ts`

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

| User Status | Available Agents |
|-------------|-----------------|
| `free` / `discover` | `discover` |
| `intelligence` | `discover`, `intelligence` |
| `oracle` / `admini` | `discover`, `intelligence`, `oracle` |
| Any other / `undefined` | `discover` (fallback) |

---

## Middleware Route Protection

**File:** `src/middleware.ts`

The middleware wraps the `auth()` function from NextAuth, receiving the authenticated request with `req.auth` populated when a valid session exists.

### Route Classification

```typescript
// Public routes (no auth required)
const isPublicRoute =
  nextUrl.pathname === "/login" ||
  nextUrl.pathname.startsWith("/share/") ||
  nextUrl.pathname === "/test-verification" ||
  nextUrl.pathname === "/test_visi";

// Special pages
const isRegistrationPending = nextUrl.pathname === "/registration-pending";
const isRestrictedAccess = nextUrl.pathname === "/restricted-access";

// Dev-only routes (blocked unless DEV_MODE=true)
const isDevRoute =
  nextUrl.pathname.startsWith("/markdown") ||
  nextUrl.pathname.startsWith("/test-markdown");
```

### Decision Flow Diagram

```
Request
  |
  v
[Is dev route?] --yes--> [DEV_MODE=true?] --no--> 404 rewrite
  |                           |
  no                         yes --> next()
  |
  v
[SKIP_AUTH=true?] --yes--> next() (bypass all auth)
  |
  no
  |
  v
[Is logged in?] --no--> [Is public route?] --yes--> next()
  |                          |
  |                         no --> redirect /login
  |
  yes (logged in)
  |
  v
[On /login?] --yes--> [Restricted env + not admin?] --yes--> redirect /restricted-access
  |                        |
  |                       no --> [status=unauthorized?] --yes--> redirect /registration-pending
  |                                    |
  |                                   no --> redirect / (home)
  |
  no
  |
  v
[Other public route?] --yes--> next()
  |
  no
  |
  v
[On /restricted-access?] --yes--> next()
  |
  no
  |
  v
[Restricted env + not admin?] --yes--> redirect /restricted-access
  |
  no
  |
  v
[status=unauthorized + not on /registration-pending?] --yes--> redirect /registration-pending
  |
  no
  |
  v
[Authorized status + on /registration-pending?] --yes--> redirect / (home)
  |
  no
  |
  v
next() (allow access)
```

### Environment-Based Access Control

```typescript
const appEnv = process.env.NEXT_PUBLIC_APP_ENV;
const isRestrictedEnv = appEnv === "staging" || appEnv === "preprod";
```

When `NEXT_PUBLIC_APP_ENV` is `"staging"` or `"preprod"`, **only admin users** (`isAdmin === true`) can access the application. All non-admin authenticated users are redirected to `/restricted-access`.

The authorized statuses that allow access to the main application:

```typescript
const authorizedStatuses = ['free', 'paid', 'admini', 'discover', 'intelligence', 'oracle'];
```

### Matcher Configuration

```typescript
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

The middleware runs on all routes **except**:
- `/api/*` -- API routes handle their own auth
- `/_next/static/*` -- static assets
- `/_next/image/*` -- Next.js image optimization
- `/favicon.ico`

---

## Google OAuth Flow

### ID-to-UUID Mapping

**File:** `src/auth.ts`

Google account IDs are converted to deterministic UUID v5-format strings using SHA-256:

```typescript
async function googleIdToUuid(googleId: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(googleId);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // Format as UUID v5 (xxxxxxxx-xxxx-5xxx-xxxx-xxxxxxxxxxxx)
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '5' + hash.substring(13, 16),
    ((parseInt(hash.substring(16, 18), 16) & 0x3f) | 0x80).toString(16) + hash.substring(18, 20),
    hash.substring(20, 32)
  ].join('-');
}
```

This function uses the Web Crypto API (Edge Runtime compatible) and guarantees the same Google account always maps to the same UUID. The `jwt` callback first checks if a profile already exists with the user's email (to handle users who signed up via magic link first), and falls back to generating a UUID from the Google ID.

### Profile Upsert on Sign-In

On every Google sign-in, the `signIn` callback calls `upsertProfile()` with:
- `id`: deterministic UUID from `googleIdToUuid()`
- `email`: Google account email
- `username`: Google display name, or email prefix as fallback
- `avatarUrl`: Google profile picture URL
- `status`: `"oracle"` (default for new profiles)

If a profile with the same email already exists (e.g., created via magic link), the existing profile is updated rather than creating a duplicate.

---

## Magic Link Flow

The magic link authentication is a multi-step process involving Supabase OTP, client-side token handling, profile creation, and NextAuth credentials sign-in.

### Step 1: Sending the Magic Link

**API:** `POST /api/auth/magiclink`
**File:** `src/app/api/auth/magiclink/route.ts`

```typescript
const { error } = await supabase.auth.signInWithOtp({
  email,
  options: {
    emailRedirectTo: `${origin}/login`,
    shouldCreateUser: true,
  },
});
```

- Validates the email format server-side.
- Dynamically determines the origin from the `Origin` or `Referer` header, falling back to `NEXTAUTH_URL` or `http://localhost:3000`.
- Calls Supabase `signInWithOtp()` which sends an email containing a magic link.
- The magic link redirects the user back to `/login` with an implicit flow hash fragment containing `access_token`, `refresh_token`, and `type`.

### Step 2: Callback Processing on the Login Page

**File:** `src/app/login/page.tsx`

When the user clicks the magic link in their email, they are redirected to `/login#access_token=...&refresh_token=...&type=magiclink` (or `type=signup` for first-time users).

A `useEffect` hook on the login page detects the URL hash:

```typescript
useEffect(() => {
  const hash = window.location.hash;
  if (hash) {
    const hashParams = new URLSearchParams(hash.substring(1));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    const type = hashParams.get("type");

    if (accessToken && refreshToken && (type === "magiclink" || type === "signup" || type === "email")) {
      // Decode JWT to get userId and email
      const tokenPayload = JSON.parse(atob(accessToken.split(".")[1]));
      const userId = tokenPayload.sub;
      const userEmail = tokenPayload.email;

      // Clear hash from URL
      window.history.replaceState(null, "", window.location.pathname);

      // Check if user profile exists
      // ...
    }
  }
}, [router, t]);
```

### Step 3: Profile Check

**API:** `POST /api/auth/magiclink/check`
**File:** `src/app/api/auth/magiclink/check/route.ts`

After extracting tokens from the hash, the login page calls `/api/auth/magiclink/check` with the `userId` and `email`:

```typescript
const checkResponse = await fetch("/api/auth/magiclink/check", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ userId, email: userEmail }),
});
```

The check endpoint queries the `profiles` table by email first, then by user ID:

- **Profile found with `first_name` and `last_name`**: `{ exists: true, registrationComplete: true, status: "..." }` -- user is signed in directly.
- **Profile found without names**: `{ exists: true, registrationComplete: false }` -- user needs to complete registration.
- **No profile found**: `{ exists: false, registrationComplete: false }` -- new user, needs full registration.

### Step 4: New User Registration

If the profile check indicates an incomplete or missing profile, the login page transitions to a registration form (`registrationStep === "collecting_info"`) that collects the user's first and last name.

On submission, it calls:

**API:** `POST /api/auth/magiclink/callback`
**File:** `src/app/api/auth/magiclink/callback/route.ts`

```typescript
const response = await fetch("/api/auth/magiclink/callback", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    userId: pendingUserInfo.userId,
    email: pendingUserInfo.email,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    isNewUser: true,
  }),
});
```

The callback endpoint uses `upsertProfile()` to create or update the profile with the provided name, setting the default status to `"oracle"`.

### Step 5: NextAuth Credentials Sign-In

After the profile is created (or for existing users with complete profiles), the login page calls NextAuth's `signIn()` with the Supabase tokens:

```typescript
const result = await signIn("magic-link", {
  accessToken,
  refreshToken,
  redirect: false,
});
```

This triggers the `Credentials` provider's `authorize()` function in `src/auth.ts`, which verifies the tokens against Supabase Auth and returns the user object. NextAuth then creates a JWT session.

After sign-in:
- **Existing user with `unauthorized` status**: redirected to `/registration-pending`.
- **Existing authorized user**: redirected to `/chat`.
- **New user** (just completed registration): redirected to `/registration-pending` (new users start as unauthorized until manually approved).

### Complete Magic Link Sequence

```
User enters email on /login
  |
  v
POST /api/auth/magiclink  -->  Supabase sends OTP email
  |
  v
User clicks email link  -->  Redirect to /login#access_token=...&refresh_token=...
  |
  v
Login page useEffect detects hash, extracts tokens, decodes JWT
  |
  v
POST /api/auth/magiclink/check  -->  Checks if profile exists
  |
  +--> [Existing + complete] --> signIn("magic-link", tokens) --> /chat or /registration-pending
  |
  +--> [Existing + incomplete] or [New user] --> Show registration form
       |
       v
       User enters first/last name, submits
       |
       v
       POST /api/auth/magiclink/callback  -->  upsertProfile()
       |
       v
       signIn("magic-link", tokens) --> /registration-pending
```

---

## Login Page Implementation

**File:** `src/app/login/page.tsx`

The login page is a client component (`"use client"`) with three distinct UI states:

### State 1: Processing Magic Link (`isProcessingMagicLink === true`)

A full-screen loading spinner shown while the magic link callback is being processed in the background.

### State 2: Registration Form (`registrationStep === "collecting_info"`)

Shown for new users or users with incomplete profiles who authenticated via magic link. Contains:
- Logo and branding
- First name input (required)
- Last name input (required)
- Submit button ("Create Account")
- The user's email is displayed as read-only context

### State 3: Main Login Form (default)

The primary login UI with:
- **Logo and branding** (theme-aware, switches between light/dark SVGs)
- **Google Sign-In button** -- calls `signIn("google", { callbackUrl: "/", redirect: true })`
- **Divider** ("or continue with")
- **Magic link email form** -- email input with client-side validation, submit sends `POST /api/auth/magiclink`
- **Success state** -- after magic link is sent, shows a green confirmation card with "check your email" message and a "try again" reset button
- **Error state** -- inline error message with `AlertCircle` icon
- **Footer** -- terms text, encryption badge, certification badge

Key component state types:

```typescript
type MagicLinkStatus = "idle" | "sending" | "sent" | "error";
type RegistrationStep = "none" | "collecting_info";

interface MagicLinkUserInfo {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
}
```

The page uses `useTheme()` from `next-themes` for theme-aware logo rendering and `useI18n()` for internationalized text.

---

## Profile Upsert Logic

**File:** `src/lib/supabase/profiles.ts`

The `upsertProfile()` function is the central profile creation/update mechanism used by both Google OAuth and magic link flows:

```typescript
export async function upsertProfile(
  adminClient: SupabaseClient<Database>,
  params: UpsertProfileParams,
): Promise<string | null>
```

Resolution order:
1. **Check by email** (`profiles.mail = email`): if found, update that profile and return its ID.
2. **Check by ID** (`profiles.id = id`): if found, update that profile (also sets the email) and return the ID.
3. **Insert new profile**: create a new row with all provided fields.

This order prevents duplicate profiles when a user signs up via magic link (Supabase-assigned UUID) and later signs in with Google (deterministic UUID from `googleIdToUuid`). The email match takes priority, ensuring the existing profile is reused.

Fields set on insert:
- `id`, `mail`, `username` (or email prefix fallback), `avatar_url`, `first_name`, `last_name`, `status` (defaults to `"oracle"`), `updated_at`

Fields updated on existing profile:
- `updated_at`, `status`, and optionally `username`, `avatar_url`, `first_name`, `last_name` (only if provided)

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/auth.ts` | NextAuth configuration: providers, callbacks, cookie settings |
| `src/middleware.ts` | Route protection, environment gating, status-based redirects |
| `src/app/api/auth/[...nextauth]/route.ts` | NextAuth GET/POST route handlers (3 lines, re-exports `handlers`) |
| `src/app/api/auth/magiclink/route.ts` | Sends magic link email via Supabase OTP |
| `src/app/api/auth/magiclink/check/route.ts` | Checks if a user profile exists and registration is complete |
| `src/app/api/auth/magiclink/callback/route.ts` | Creates/updates user profile for magic link users |
| `src/app/login/page.tsx` | Login page UI: Google OAuth, magic link form, new user registration |
| `src/types/next-auth.d.ts` | TypeScript augmentations for NextAuth Session and User types |
| `src/types/agents.ts` | `UserStatus` type, `AgentType`, `getAvailableAgents()` |
| `src/lib/supabase/profiles.ts` | `upsertProfile()` -- central profile create/update logic |
