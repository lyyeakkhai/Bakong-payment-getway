# Requirements — Phase 1 MVP (Local Environment)

## Path correction
Context files live under `backend/.context/` (leading dot), not `backend/context/`.
This spec lives at `backend/.context/feature-specs/2026-06-01-phase1-mvp-local/`.

## Scope
Backend-only Phase 1 of `roadmap.md`: prove the core compile + parse loop on a
single local node. The frontend tester (`PaymentTester.tsx`, Vite proxy) is
explicitly **deferred** and not built here.

## Confirmed decisions
1. **Backend-only.** No frontend work in this feature.
2. **Zero new dependencies for tests.** Use Node's built-in `node:test` runner
   via the already-installed `tsx` (`node --import tsx --test`). Real TDD on the
   pure pieces; a capstone simulation test matches the roadmap exit criteria.
3. **KHQR Individual mode**, bot degrades gracefully (only `.launch()` when
   `TELEGRAM_BOT_TOKEN` is set; parse/dispatch logic stays callable for tests).

## In scope
- `src/types.ts` — zod schemas + inferred types (request body, status, webhook).
- `src/config.ts` — zod-validated env + `PROJECT_ROUTES` + `ProjectPrefix`.
- `src/store.ts` — typed in-memory status `Map` accessor (single shared seam).
- `src/khqr.ts` — pure, stateless KHQR string builder.
- `src/telegram.ts` — crash-proof `channel_post` parse + webhook dispatch.
- `src/server.ts` — Express wiring of the two endpoints + conditional bot boot.
- `*.test.ts` per module + a capstone end-to-end simulation test.
- `.env.example`.

## Out of scope
- Frontend, Phase 2 (real channel/token handshake hardening), Phase 3 (PM2 cluster).

## Boundary contract
| Direction | Channel | Payload |
|-----------|---------|---------|
| Inbound | `POST /api/generate-khqr` | `{ projectPrefix, amount }` → `{ orderId, qrString }` |
| Inbound | `GET /api/status/:orderId` | → `{ orderId, status }` (404 unknown) |
| Outbound | tenant webhook from `PROJECT_ROUTES` | `{ orderId, amount, secureToken }` |

`orderId = ${prefix}-${Date.now()}` and carries tenant identity end-to-end.
Errors: `400` invalid prefix / non-positive amount; `404` unknown orderId.

## PROJECT_ROUTES
```
AGENT: https://api.agentdoc.ai/v1/payments/fulfill
DIAG:  https://api.diagramapp.com/api/payment/success
LOCAL: http://localhost:3002/api/payment/webhook
```

## Environment variables (.env.example)
```
TELEGRAM_BOT_TOKEN=
BAKONG_ACCOUNT_ID=your_name@bank
MERCHANT_NAME=Your Merchant
SHARED_WEBHOOK_SECRET=
PORT=3001
```

## Code-standard constraints (non-negotiable)
- No `any`; no `@ts-ignore` / `@ts-expect-error`. HTTP handlers use typed generics.
- All inbound data (body, params, env) validated with `zod` (`safeParse`).
- `ProjectPrefix = keyof typeof PROJECT_ROUTES`; unknown prefix is dropped, not guessed.
- Secrets (`SHARED_WEBHOOK_SECRET`, `TELEGRAM_BOT_TOKEN`) only from env, never logged
  (pino `redact`). Refuse to dispatch if `SHARED_WEBHOOK_SECRET` is unset.
- Crash-proof bot: `catch (err: unknown)` + narrow; log via `pino`; never throw to top
  level; no `console.log`.
- Module split `types / config / store / khqr / telegram / server`; `khqr.ts` pure
  (no Express/bot objects); status `Map` mutated only through the `store.ts` accessor.

## SDK note (verified against installed `bakong-khqr@1.0.20` + `@types`)
- `@types/bakong-khqr` declares `IndividualInfo` as an **interface**; pass a plain
  object literal to `generateIndividual` (no positional `new IndividualInfo(...)`).
- Required-ish fields used: `bakongAccountID`, `merchantName`, `acquiringBank`,
  `currency` (`khqrData.currency.usd` = 840), `amount`, `billNumber`.
- `generateIndividual(info)` returns `{ status, data }`; on success `data = { qr, md5 }`
  but is typed `unknown` — narrow before reading `qr`.

## Exit criteria (Phase 1)
- `pnpm typecheck` passes.
- A simulated `channel_post` flips an order to `PAID` and fires the `LOCAL` webhook.
