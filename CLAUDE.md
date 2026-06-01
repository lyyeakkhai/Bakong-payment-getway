# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (`cd backend`)
```bash
npm run dev        # tsx watch src/server.ts (hot reload)
npm run build      # tsc → dist/
npm run start      # node dist/server.js
npm run typecheck  # tsc --noEmit (no emit, type-check only)
npm test           # node --import tsx --test (runs *.test.ts files)
npm test -- src/server.test.ts  # run a single test file
```

### Frontend (`cd frontend`)
```bash
npm run dev    # vite dev server (proxies /api → localhost:3001)
npm run build  # tsc -b && vite build
npm run lint   # eslint
```

## Architecture

Database-less, in-memory, multi-tenant KHQR payment gateway. A Telegram bot reads bank credit alerts and dispatches webhooks to tenant services.

**Backend modules** (`backend/src/`):
- `types.ts` — shared Zod schemas + inferred TS types; single source of truth for request/response shapes
- `config.ts` — `PROJECT_ROUTES` map (tenant prefix → webhook URL) + env validation via Zod; `ProjectPrefix = keyof typeof PROJECT_ROUTES`
- `store.ts` — in-memory `Map<string, 'PENDING' | 'PAID'>` with typed accessors; the only shared state between the HTTP API and the bot
- `khqr.ts` — pure stateless KHQR string generation using `bakong-khqr` (`IndividualInfo` → `BakongKHQR.generateIndividual`)
- `telegram.ts` — Telegraf bot: `channel_post` listener, credit guard regex, tenant/amount extraction, webhook dispatch
- `server.ts` — Express 5 entry point; exports `createApp()` for tests; boots only when run directly

**Data flow**: `POST /api/generate-khqr` → mints `orderId = PREFIX-<timestamp>` → seeds store as `PENDING` → returns `{ orderId, qrString }`. Bot receives bank alert → validates credit → marks store `PAID` → POSTs `{ orderId, amount, secureToken }` to `PROJECT_ROUTES[prefix]`. Frontend polls `GET /api/status/:orderId` every 3s.

**Adding a tenant**: one line in `PROJECT_ROUTES` in `config.ts`; `ProjectPrefix` type updates automatically.

## Code Standards

- **No `any`** — use `unknown` + narrowing. All inbound data validated with Zod before use.
- All HTTP handlers must type their `Request`/`Response` generics explicitly.
- `catch (err: unknown)` — narrow before use; log with `logger.error({ err }, 'message')` via pino. No `console.log`.
- Never log `SHARED_WEBHOOK_SECRET` or `TELEGRAM_BOT_TOKEN`.
- ESM imports require explicit `.js` extensions (NodeNext module resolution).
- The Telegraf handler must be fully defensive — a bad message must never crash the process.
- `SHARED_WEBHOOK_SECRET` unset → refuse to dispatch (do not send empty token).

## Environment

Copy `backend/.env.example` to `backend/.env`:
```
TELEGRAM_BOT_TOKEN=
BAKONG_ACCOUNT_ID=your_name@bank
MERCHANT_NAME=Your Merchant
SHARED_WEBHOOK_SECRET=
PORT=3001
```
`TELEGRAM_BOT_TOKEN` and `SHARED_WEBHOOK_SECRET` are optional for local dev; the bot degrades gracefully when absent.
