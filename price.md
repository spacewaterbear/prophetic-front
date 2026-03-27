# Credit System — How Credits Are Computed

## Overview

Free users receive **100 credits** upon registration. Credits are consumed with each message sent. When credits reach 0, the chat input is blocked and the user is prompted to upgrade to a paid plan.

Testers (`is_tester = true` in the `profiles` table) are exempt from credit tracking — they always see 100 credits available.

---

## Formula

```
remaining_credits = max(0, 100 - total_cost × 100)
```

| Constant             | Value | Source                                        |
|----------------------|-------|-----------------------------------------------|
| `TOTAL_FREE_CREDITS` | 100   | `src/app/api/credits/route.ts`                |
| `COST_MULTIPLIER`    | 100   | env var `CREDITS_COST_MULTIPLIER` (default 100) |

**`total_cost`** is the cumulative sum of `estimated_cost` (in USD) across all of the user's messages, returned by the Supabase RPC function `get_total_cost(p_user_id)`.

So concretely:
- A message costing **$0.01** consumes `0.01 × 100 = 1` credit
- A message costing **$0.10** consumes `0.10 × 100 = 10` credits
- **10 queries averaging $0.10 each** → $1.00 total → `1.00 × 100 = 100` credits exhausted

To exhaust all 100 credits, a user must accumulate **$1.00 in total API costs**.

---

## Data Source: `message_usage` Table

Every AI response stores usage data in the `message_usage` table:

```sql
CREATE TABLE public.message_usage (
  id                BIGINT PRIMARY KEY,
  message_id        BIGINT REFERENCES messages ON DELETE CASCADE,
  model_name        TEXT,
  prompt_tokens     INTEGER,
  completion_tokens INTEGER,
  total_tokens      INTEGER,
  estimated_cost    NUMERIC(10, 6),  -- in USD, 6 decimal precision
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
```

The `estimated_cost` field is computed server-side (by the Prophetic API backend) based on the model used and token counts.

---

## API Endpoint

**`GET /api/credits`** — returns the current credit balance for the authenticated user.

Response:
```json
{ "credits": 73.5, "isTester": false }
```

- If the user is a tester: returns `{ credits: 100, isTester: true }` without querying usage
- If the RPC call fails: returns `{ credits: 100, isTester: false }` as a safe fallback

---

## Client-Side Behavior (`useCredits` hook)

- Fetches from `/api/credits` on mount
- Caches result in `localStorage` under key `credits_cache_{userId}`
- Exposes `creditsExhausted` flag: `true` when `isFreeUser && !isTester && credits <= 0`
- Refreshes automatically after each chat response completes (for free users only)

---

## UI Indicators

| State                   | Display                        |
|-------------------------|--------------------------------|
| Credits > 20            | Normal text                    |
| Credits ≤ 20            | Orange color (warning)         |
| Credits = 0             | Red color + chat input blocked |
| Tester / no data        | "Early Access" label           |

When exhausted, `ChatInput` shows an upgrade prompt linking to the pricing page.

---

## User Status & Credit Applicability

Credits only apply to **free** users. Paid plan users (`discover`, `intelligence`, `oracle`, `admini`) are not subject to the credit limit.

| Status         | Credit limit applies? | Agents available              |
|----------------|----------------------|-------------------------------|
| `free`         | Yes (100 credits)    | Flash only                    |
| `discover`     | No                   | Flash, Discover               |
| `intelligence` | No                   | Flash, Discover, Intelligence |
| `oracle`       | No                   | All agents                    |
| `admini`       | No                   | All agents                    |
| `is_tester`    | No (always 100)      | Depends on status             |
