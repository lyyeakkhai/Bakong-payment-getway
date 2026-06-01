# Plan — Phase 1 MVP (Local Environment)

Module build order: `types.ts → config.ts → store.ts → khqr.ts → telegram.ts → server.ts`.
NodeNext: relative imports use explicit `.js` extensions (e.g. `from './types.js'`).

## Task 0: Branch + spec scaffold
- Create branch `feature/phase1-mvp-local` off `dev`.
- Create `backend/.context/feature-specs/2026-06-01-phase1-mvp-local/` with
  `requirements.md`, `plan.md` (this file), `validation.md`.
- Demo: branch checked out; three spec files present.

## Task 1: Test harness
- Add `"test": "node --import tsx --test"` to `backend/package.json`.
- Add `src/smoke.test.ts` (`node:test` + `node:assert/strict`).
- Demo: `pnpm test` green; `pnpm typecheck` passes.

## Task 2: Shared types (`types.ts`)
- zod schemas + `z.infer`: generate-khqr body (`projectPrefix` ∈ route keys,
  `amount` positive), status response, outbound webhook `{ orderId, amount, secureToken }`.
- Test: accepts valid; rejects bad prefix and non-positive amount.

## Task 3: Config + status store (`config.ts`, `store.ts`)
- `config.ts`: zod-validated env (`TELEGRAM_BOT_TOKEN` optional; `BAKONG_ACCOUNT_ID`,
  `MERCHANT_NAME`, `SHARED_WEBHOOK_SECRET`, `PORT` coerced) via dotenv; export
  `PROJECT_ROUTES`, `ProjectPrefix`, and an env parser usable for tests.
- `store.ts`: `Map<string,'PENDING'|'PAID'>` with `setStatus` / `getStatus`.
- Test: env parse fails on missing required var; route lookup; set→get; unknown → undefined.

## Task 4: KHQR builder (`khqr.ts`)
- Pure `generateKhqr(prefix, amount, now = Date.now())` → `{ orderId, qrString }`;
  `orderId = ${prefix}-${now}`; build `IndividualInfo` object literal →
  `new BakongKHQR().generateIndividual(...)`; narrow `data` → return `qr`.
- Test: `orderId` matches `^PREFIX-\d+$` with injected clock; `qrString` non-empty.

## Task 5: Bot parse/dispatch (`telegram.ts`)
- Pure `handleChannelText(text)`: guards credit `/Received|Inward/i`, tenant
  `/([A-Z]+)-(\d+)/`, amount `/\$\s*([\d,]+(?:\.\d+)?)/`; drop+log on any miss or
  unknown prefix; on success `setStatus(orderId,'PAID')` then `dispatchWebhook`.
- `dispatchWebhook`: refuse if `SHARED_WEBHOOK_SECRET` unset; guarded `fetch`
  (AbortController timeout, non-2xx logged, `catch (err: unknown)`, never throws).
- Bot launch conditional on `TELEGRAM_BOT_TOKEN`. Exports injectable for tests.
- Test (mocked fetch): debit / malformed / `$`-less / unknown-prefix dropped, no
  dispatch, no throw; valid `LOCAL-...` → PAID + one fetch with `{orderId,amount,secureToken}`.

## Task 6: Express wiring (`server.ts`)
- `POST /api/generate-khqr`: zod `safeParse` → 400 on fail; else `generateKhqr` →
  seed `PENDING` → 200 `{ orderId, qrString }`. Typed `Request` generics.
- `GET /api/status/:orderId`: `getStatus` → 200 `{ orderId, status }` or 404.
- `cors`, pino (redact secrets), conditional bot boot, `app.listen(PORT)`.
- Export pure handler functions so tests run without an HTTP server/extra deps.
- Test: 400 bad body, 200 happy path, 404 unknown id.

## Task 7: Capstone + docs + tracker
- E2E test: generate LOCAL order → feed matching simulated `channel_post` →
  assert `PAID` + LOCAL webhook fired once with `{orderId,amount,secureToken}` (fetch mocked).
- Add `backend/.env.example`.
- Update `backend/.context/progress-tracker.md`: tick modules-installed,
  generate-khqr endpoint, regex reader loop. Leave PM2 unticked.
- Demo: `pnpm typecheck` + `pnpm test` both green.
