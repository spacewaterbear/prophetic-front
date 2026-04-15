/**
 * Centralized API client — wraps fetch with retry, error parsing, and GET deduplication.
 *
 * Usage:
 *   import { api } from "@/lib/api";
 *   const data = await api.get<CreditsResponse>("/api/credits");
 *   const conv = await api.post<ConversationResponse>("/api/conversations", { title });
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApiError {
  status: number;
  message: string;
  code?: string;
}

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor({ status, message, code }: ApiError) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Response type definitions for our API routes
// ---------------------------------------------------------------------------

export interface CreditsResponse {
  credits: number;
  isTester: boolean;
}

export interface GeolocationResponse {
  language: string;
  country: string;
}

export interface StripePricesResponse {
  flash: string | null;
  discover: string | null;
  oracle: string | null;
}

export interface ConversationItem {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  model?: string;
}

export interface ConversationsListResponse {
  conversations: ConversationItem[];
}

export interface CreateConversationResponse {
  conversation: ConversationItem;
}

export interface ConversationDetailResponse {
  id: number;
  title: string;
  messages: import("@/types/chat").Message[];
}

export interface UploadResponse {
  url: string;
  path: string;
}

export interface ErrorEnvelope {
  detail?: string;
  message?: string;
  code?: string;
}

// ---------------------------------------------------------------------------
// Retry configuration
// ---------------------------------------------------------------------------

const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 500;

function isRetryable(status: number): boolean {
  return RETRYABLE_STATUSES.has(status);
}

function backoff(attempt: number): Promise<void> {
  return new Promise((res) => setTimeout(res, RETRY_BASE_MS * 2 ** attempt));
}

// ---------------------------------------------------------------------------
// GET deduplication — in-flight promises are reused per URL
// ---------------------------------------------------------------------------

const inflight = new Map<string, Promise<Response>>();

function deduplicatedGet(url: string, init: RequestInit): Promise<Response> {
  if (inflight.has(url)) {
    return inflight.get(url)!.then((r) => r.clone());
  }
  const promise = fetch(url, init).finally(() => inflight.delete(url));
  inflight.set(url, promise);
  return promise;
}

// ---------------------------------------------------------------------------
// Core request function
// ---------------------------------------------------------------------------

async function request<T>(
  method: string,
  url: string,
  body?: unknown,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  const init: RequestInit = {
    ...options,
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };

  let lastError: ApiRequestError | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) await backoff(attempt - 1);

    let response: Response;
    try {
      response =
        method === "GET"
          ? await deduplicatedGet(url, init)
          : await fetch(url, init);
    } catch (err) {
      // Network error — retry
      lastError = new ApiRequestError({
        status: 0,
        message: err instanceof Error ? err.message : "Network error",
      });
      if (attempt < MAX_RETRIES) continue;
      throw lastError;
    }

    if (response.ok) {
      return response.json() as Promise<T>;
    }

    if (isRetryable(response.status) && attempt < MAX_RETRIES) {
      lastError = new ApiRequestError({
        status: response.status,
        message: `HTTP ${response.status}`,
      });
      continue;
    }

    // Non-retryable error — parse the error body and throw
    let errorBody: ErrorEnvelope = {};
    try {
      errorBody = await response.json();
    } catch {
      // body is not JSON, leave empty
    }

    throw new ApiRequestError({
      status: response.status,
      message: errorBody.detail ?? errorBody.message ?? `HTTP ${response.status}`,
      code: errorBody.code,
    });
  }

  throw lastError!;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const api = {
  get: <T>(url: string, options?: RequestInit) =>
    request<T>("GET", url, undefined, options),

  post: <T>(url: string, body?: unknown, options?: RequestInit) =>
    request<T>("POST", url, body, options),

  patch: <T>(url: string, body?: unknown, options?: RequestInit) =>
    request<T>("PATCH", url, body, options),

  delete: <T>(url: string, options?: RequestInit) =>
    request<T>("DELETE", url, undefined, options),
};
