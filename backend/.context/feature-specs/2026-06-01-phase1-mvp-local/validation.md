# Validation — Phase 1 MVP merge gate

The feature may merge into `dev` only when **all** of the following hold.

## Build & tests
- [ ] `pnpm typecheck` is clean (strict, no errors).
- [ ] `pnpm test` is all green, including the Task 7 capstone (order flips to
      `PAID` and the `LOCAL` webhook fires with `{ orderId, amount, secureToken }`).

## Type safety
- [ ] No `any`; no `@ts-ignore` / `@ts-expect-error`.
- [ ] HTTP handlers use typed `Request`/`Response` generics.

## Validation & contract
- [ ] All inbound data (request body, route params, env) validated with `zod`.
- [ ] Bad body / invalid prefix / non-positive amount → `400`.
- [ ] Unknown `orderId` → `404`.
- [ ] Outbound webhook body is exactly `{ orderId, amount, secureToken }`.

## Security
- [ ] Secrets (`SHARED_WEBHOOK_SECRET`, `TELEGRAM_BOT_TOKEN`) only from env, never logged
      (pino `redact`).
- [ ] Service refuses to dispatch if `SHARED_WEBHOOK_SECRET` is unset.

## Crash-proofing
- [ ] Bot never throws on malformed input; debit / non-credit / unknown-prefix /
      `$`-less messages are dropped.
- [ ] `catch (err: unknown)` everywhere with `pino` logging; no `console.log`.

## Structure
- [ ] Module split present: `types / config / store / khqr / telegram / server`.
- [ ] `khqr.ts` is pure (no Express/bot objects).
- [ ] Status `Map` is mutated only through the `store.ts` accessor.

## Artifacts
- [ ] `backend/.env.example` present with the five vars.
- [ ] `backend/.context/progress-tracker.md` updated (three Phase-1 boxes ticked;
      PM2 left unticked).
- [ ] Spec docs present: `requirements.md`, `plan.md`, `validation.md`.
