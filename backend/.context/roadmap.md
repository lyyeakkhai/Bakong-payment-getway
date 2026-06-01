# Roadmap — Payment Hub Execution Lifecycle

The service ships in three phases. Each phase is independently runnable and verifiable.

---

## Phase 1 — MVP (Local Environment)

Goal: prove the core compile + parse loop on a single local node.

- Initialize the local Express (TypeScript/ESM) runtime via `pnpm dev` (`tsx watch src/server.ts`).
- Implement stateless dynamic EMV string processing on `POST /api/generate-khqr` using `bakong-khqr` (`IndividualInfo` → `generateIndividual`), minting `billNumber = PREFIX-<timestamp>`.
- Stand up the in-memory `Map<string,'PENDING'|'PAID'>` status store and `GET /api/status/:orderId`.
- Build the custom Regex filters inside the Telegraf frame hook (`bot.on('channel_post')`):
  - credit guard `/Received|Inward/i`
  - tenant extraction `/([A-Z]+)-(\d+)/`
  - amount extraction `/\$\s*([\d,]+(?:\.\d+)?)/`
- Exit criteria: `pnpm typecheck` passes; a simulated channel post flips an order to `PAID` and fires a local webhook (`LOCAL` route).

## Phase 2 — Staging (Channel Automation)

Goal: connect real bank alerts and validate multi-tenant routing + security.

- Link the live personal bank alert notifications into a **private Telegram channel** that the bot reads.
- Validate the webhook **secret token handshake** end-to-end: outbound `secureToken` must equal each tenant's `SHARED_WEBHOOK_SECRET`.
- Exercise dynamic routing by custom project prefix flags — confirm `AGENT-xxxx` reaches AgentDoc AI and `DIAG-xxxx` reaches Diagram AI via `PROJECT_ROUTES`.
- Harden parsing against malformed/edge bank strings (partial text, missing `$`, debit noise).
- Exit criteria: real credit alerts route to the correct tenant with a verified token, debits/system logs are rejected.

## Phase 3 — Production (Scaled Clustering)

Goal: run resiliently across cloud/VPS nodes.

- Deploy on cloud servers or VPS nodes under **PM2** (`pm2 start` with cluster mode).
- Monitor cluster memory profiles (`pm2 monit`) and restart policies; size worker count to the node.
- Set up automated token cycle scripts (rotating `SHARED_WEBHOOK_SECRET` / bot token refresh) on a schedule.
- Note: because state is in-memory, run a **single bot consumer** (one Telegraf instance) even when the HTTP API is clustered, to avoid duplicate webhook dispatch.
- Exit criteria: PM2 cluster validated on the server node, zero-downtime reloads, alert→webhook latency within target.

---

## Source of truth

Each phase maps directly to the docs:

- **Phase 1** ← [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) §5–§6, §10 (endpoints, bot flow, build order) and [`../../docs/api-workflow.md`](../../docs/api-workflow.md) §3 (bot validation decision flow + the three regexes).
- **Phase 2** ← [`../../docs/system-workflow.md`](../../docs/system-workflow.md) §1, §5 (token handshake) and [`../../docs/api-workflow.md`](../../docs/api-workflow.md) §4 (multi-tenant routing: `AGENT` vs `DIAG`).
- **Phase 3** ← [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) §7 note + [`../../docs/api-workflow.md`](../../docs/api-workflow.md) §7 (database-less rationale → single in-memory consumer).
