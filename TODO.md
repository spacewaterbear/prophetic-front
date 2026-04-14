# TODO — prophetic-front

## Critical

- [x] **Fix admin type safety** — `isAdmin` is now declared on the `Session` type in `src/types/next-auth.d.ts`; no `as any` cast remains in `middleware.ts` or `auth.ts`.
- [x] **Refactor `useChatConversation.ts`** — streaming state migrated to `useReducer` (eliminates race conditions); `window.dispatchEvent("refreshConversations")` replaced with `bumpConversations()` from `SidebarContext`.
- [x] **Split `/api/conversations/[id]/messages/route.ts`** — event parsing, error extraction, and stream accumulation extracted to `src/lib/utils/error-parsing.ts` and `src/lib/utils/stream-accumulator.ts`; route is now 367 lines.

## Security

- [x] **Replace URL hash auth token flow** — Supabase client configured with `flowType: "pkce"`; `emailRedirectTo` now points to `/auth/callback`; new `/auth/callback/page.tsx` exchanges `?code=` query param via `exchangeCodeForSession`; hash-reading logic removed from `login/page.tsx`.
- [x] **Re-validate credits server-side** — `POST /api/conversations/[id]/messages` now calls `get_total_cost` RPC for `free` users before processing; returns 402 `credits_exhausted` if balance is zero.
- [x] **Remove `NEXT_PUBLIC_SKIP_AUTH`** — guarded with `process.env.NODE_ENV === "development"` in `middleware.ts` and `messages/route.ts`; dead-code-eliminated at production build time.
- [x] **Restrict image remote patterns** — wildcard `{ hostname: "**" }` removed from `next.config.js`; all card components with API-supplied image URLs now use `unoptimized` (bypasses the optimizer/proxy entirely).

## State Management

- [x] **Introduce Zustand (or Jotai)** for chat state — `src/store/chatPendingStore.ts` uses Zustand + `persist` with sessionStorage backend; all 10 cross-navigation sessionStorage keys migrated; `useChatConversation`, `page.tsx`, `VignetteDetailView`, `[vignetteSlug]/page`, `artists/page`, and `products/page` updated to use the store.
- [x] **Cache Stripe prices** — `stripe-prices-context.tsx` now checks localStorage for a cached response (1-hour TTL) before fetching.
- [x] **Cache geolocation result** — `i18n-context` now caches the detected language in `sessionStorage` for the session duration.
- [x] **Persist sidebar preference** — user-initiated sidebar open/closed changes are now persisted in `localStorage`; restored on mount.

## API Layer

- [x] **Create a centralized API client** — `src/lib/api.ts` wraps fetch with typed `api.get/post/patch/delete`; used in `useCredits`, `useChatConversation`, `stripe-prices-context`, `i18n-context`.
- [x] **Add retry logic** — `api.ts` retries up to 3 times with exponential backoff (500 ms base) on 429/502/503/504 and network errors.
- [x] **Eliminate silent failures** — `.catch(() => {})` in `stripe-prices-context.tsx` replaced with `console.error`; error body parsed and thrown as `ApiRequestError`.
- [x] **Deduplicate requests** — `api.get` uses a module-level in-flight promise map so concurrent calls to the same GET URL reuse the same request.
- [x] **Add TypeScript types for all API responses** — `CreditsResponse`, `GeolocationResponse`, `StripePricesResponse`, `ConversationItem`, `ConversationsListResponse`, `CreateConversationResponse`, `ConversationDetailResponse`, `UploadResponse` defined in `src/lib/api.ts`.

## Performance

- [ ] **Add `useCallback` / `useMemo`** in `useChatConversation` — multiple state updates per message cause cascade re-renders. Memoize stable callbacks and derived values.
- [ ] **Use `React.memo`** on card components (RealEstateCard, ArtistCard, ClothesSearchCard, etc.) that receive stable props.
- [ ] **Add pagination or virtual scroll** for conversations sidebar — currently loads the N most recent with no scroll strategy.

## Code Quality

- [ ] **Eliminate `any` / `@ts-ignore`** — 92 instances across the codebase. Work through them type by type; start with the auth session types and API response types.
- [ ] **Reduce props drilling in ChatInput** — 11+ props passed down. Co-locate state closer to where it's used or pull it into the chat Zustand store.
- [ ] **Add error boundaries** — no `ErrorBoundary` components visible. Wrap major feature sections so one failing component doesn't crash the whole page.
- [ ] **Replace timestamp-prefixed `console.log`** in `ClientBody` with a proper logger (e.g. `pino` or a thin wrapper that no-ops in production).

## Cross-cutting (shared with backend)

- [ ] **Generate TypeScript types from OpenAPI** — use `openapi-typescript` to auto-generate types from the FastAPI schema. Eliminates manual drift between backend Pydantic models and frontend interfaces.
- [ ] **Standardize error handling** — agree on a single JSON error envelope with the backend and write one parser on the frontend side.
- [ ] **Add end-to-end tests** — no integration tests visible. Add smoke tests for auth flow, conversation creation, and streaming responses.
