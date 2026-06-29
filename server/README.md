# PortIQ API Server

Typed Node + TypeScript + Express backend for PortIQ.

## Architecture

```
Layer 1  services/marketData.ts   — provider-abstracted quotes (never in LLM)
Layer 2  services/compute.ts       — deterministic math (unit-tested)
Layer 3  services/ai.ts            — OpenRouter qualitative interpretation only
```

**Principle:** The LLM never fetches data or does math. Code computes; AI interprets.

## Stateless / horizontally scalable

The API tier is **stateless**. All shared state lives outside process memory:

| Concern | Store |
|---------|--------|
| Portfolio holdings | **Postgres** (`DATABASE_URL`) — e.g. **Supabase** |
| Quote cache, analyze/stress caches | **Redis** (`REDIS_URL`, keys prefixed `portiq:`) |
| OpenRouter global rate limit | **Redis** (`portiq:openrouter:rl:*` via `lib/rateLimit.ts`) |
| Recurring jobs (e.g. Conviction Ledger decay) | **BullMQ worker** (`npm run worker`) |

Run multiple `npm run dev` / `npm start` instances behind a load balancer; run one or more worker processes separately. Client price polling (`POST /api/prices`) stays frontend-driven.

Conviction Ledger AI uses `services/convictionLedger.ts` → `callOpenRouterChat` (same global limiter as portfolio).

### Shared-state audit (migrated)

| Was in-memory / SQLite | Now |
|------------------------|-----|
| `cache.ts` Map (analyze/stress TTL) | Redis `portiq:cache:analyze:*` / `stress:*` |
| `marketData.ts` quote Map | Redis `portiq:quote:{provider}:{symbol}:{exchange}` + stale keys |
| SQLite `better-sqlite3` | Postgres pool (`db/pg.ts`, `DATABASE_URL`) |
| Ad-hoc OpenRouter clients | `lib/openrouter.ts` singleton + `lib/rateLimit.ts` |
| Server schedulers | None; BullMQ worker for `conviction:decay-refresh` only |
| `providerInstance` / Yahoo client | OK — per-process connection singletons, not shared state |

Per-request `Map` usage in `compute.ts` is local only (not cached across requests).

## Quick start

Requires **Supabase** (or any Postgres) for `DATABASE_URL`, plus **Redis** locally or Upstash.

```bash
cp ../.env.example ../.env   # set Supabase DATABASE_URL, REDIS_URL, OPENROUTER_API_KEY
npm install
npm run dev                  # http://localhost:3000
npm run worker               # separate terminal — BullMQ repeatable jobs
```

Frontend (separate terminal):

```bash
cd .. && npm run dev         # Vite proxies /api → :3000
```

## Endpoints

| Method | Path | Layer |
|--------|------|-------|
| POST | `/api/prices` | L1 |
| GET/POST/PUT/DELETE | `/api/portfolio` | Postgres persistence |
| POST | `/api/portfolio/analyze` | L1 → L2 → L3 |
| POST | `/api/stress-test` | L1 → L2 → L3 |
| POST | `/api/analyzer/stock` | L1 data + scores + L3 AI synthesis |
| GET | `/health` | — |

## Shared types

Contract types live in [`../shared/api-types.ts`](../shared/api-types.ts) — import from both server and frontend.

## n8n (optional)

On-demand analysis uses these API endpoints for speed. n8n could optionally be reattached as a **scheduled** automation layer (e.g. daily portfolio health email) by calling `POST /api/portfolio/analyze` on a cron — not for interactive clicks.

## Tests

```bash
npm test
```
