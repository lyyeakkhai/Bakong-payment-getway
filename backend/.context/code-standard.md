# Code Standard — Strict TypeScript & Architecture

Non-negotiable rules for this microservice. CI/review must reject violations.

## 1. Absolute type safety

- **`any` is banned** — no `any` in request bodies, routing params, config objects, SDK wrappers, or catch clauses. Use `unknown` + narrowing where a type is genuinely dynamic.
- All HTTP handlers type their `Request`/`Response` generics: e.g. `Request<{}, GenerateKhqrResponse, GenerateKhqrBody>`.
- **All inbound data is validated with `zod` before use** — request bodies, route params, and parsed env. Define a `zod` schema and derive the TS type with `z.infer<typeof schema>`; never trust `req.body` shape directly. A failed `safeParse` returns `400` (HTTP) or is dropped (bot), never coerced.
- `projectPrefix` is typed as `ProjectPrefix = keyof typeof PROJECT_ROUTES`, never a loose `string`.
- `tsconfig` runs in `strict` mode; do not weaken `strict`, `noImplicitAny`, or `strictNullChecks`.
- No `@ts-ignore` / `@ts-expect-error` to silence real type errors.

## 2. Strict separation of concerns

- **Express server logic** (`server.ts`, route wiring) stays completely isolated from **Telegraf notification logic** (`telegram.ts`).
- Shared contracts live only in `types.ts`; the multi-tenant map and env live only in `config.ts`.
- The KHQR compiler (`khqr.ts`) is pure and stateless — no Express objects, no bot objects pass into it.
- The status `Map` is the single shared seam between the API and the bot, exposed through a tiny typed accessor — never reached into directly from both files with ad-hoc logic.

## 3. Secure webhook delivery

- Every outbound POST to a `PROJECT_ROUTES` target **must include `secureToken: SHARED_WEBHOOK_SECRET`** in the body schema `{ orderId, amount, secureToken }`.
- Never dispatch to a URL not present in `PROJECT_ROUTES`; an unknown prefix is dropped, not guessed.
- `SHARED_WEBHOOK_SECRET` and `TELEGRAM_BOT_TOKEN` come only from env (`dotenv`); never hard-coded, never logged.
- If `SHARED_WEBHOOK_SECRET` is unset, the service must refuse to dispatch rather than send an empty token.

## 4. Crash-proof runtime wrappers

The process must **never crash on a malformed bank payload**. Wrap with `try/catch` (or guarded parsing) around:

- all Regex text matching on `channel_post` content,
- all array/data mapping and `parseFloat` amount calculations,
- all network `fetch` calls to tenant webhooks (timeout + non-2xx handling + logged failure, no throw to top level).

Rules:
- A failed parse or failed delivery logs a structured warning via **`pino`** and returns early — it does not throw past the handler. No `console.log`; use the shared `pino` logger.
- `catch (err: unknown)` — narrow before use; never `catch (err: any)`. Log with `logger.error({ err }, 'message')`.
- The Telegraf handler is fully defensive: one bad message can never take down the bot or the HTTP server.
- Never log secrets (`SHARED_WEBHOOK_SECRET`, `TELEGRAM_BOT_TOKEN`) — redact via pino's `redact` paths.

## 5. Style

- ESM imports with explicit file extensions where required by `NodeNext`.
- Pure functions over classes for the KHQR/parse layer; no hidden global mutable state beyond the single status `Map`.
- Small, single-purpose modules — match the existing `config / khqr / telegram / server` split.

---

## Source of truth

These standards enforce the design fixed in the docs:

- Module split (`config / khqr / telegram / server`) ← [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) §3 layout + note.
- `ProjectPrefix = keyof typeof PROJECT_ROUTES` ← [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) §4.
- Outbound webhook schema `{ orderId, amount, secureToken }` ← [`../../docs/api-workflow.md`](../../docs/api-workflow.md) §5 and [`../../docs/system-workflow.md`](../../docs/system-workflow.md) §5.
- Crash-proof parsing of `channel_post` ← [`../../docs/api-workflow.md`](../../docs/api-workflow.md) §3 (every "No" branch must be handled, never thrown).
