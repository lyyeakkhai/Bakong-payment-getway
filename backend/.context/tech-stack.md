# Tech Stack — Runtime Footprint

Exact components and their role in this microservice. Versions reflect what is installed in `backend/` (audited 2026-06-01).

| Layer | Component | Role |
|-------|-----------|------|
| Runtime Engine | **Node.js (LTS 22+)** | JavaScript runtime. Local dev audited on Node 26; target deploy ≥ 22 LTS. ESM (`"type": "module"`). |
| Framework & Architecture | **Express.js (TypeScript)** — `express@5.2.1` | HTTP layer exposing `/api/generate-khqr` and `/api/status/:orderId`. Strict TS, `NodeNext` module resolution. |
| Dependency Manager | **pnpm** — `11.5.0` | Content-addressable store + hard links for fast, disk-efficient installs across backend/frontend workspaces. |
| Banking Standards Tooling | **bakong-khqr** — `1.0.20` (+ `@types/bakong-khqr`) | Compiles EMV-compliant KHQR strings via `IndividualInfo` → `BakongKHQR.generateIndividual`. |
| Stream Processing Framework | **Telegraf** — `4.16.3` | Telegram bot middleware; consumes `channel_post` bank alerts and drives the confirmation loop. |
| Runtime Validation | **zod** — `4.4.3` | Schema-first runtime validation of all inbound request bodies/params; inferred types feed the strict TS layer (no `any`). |
| Structured Logging | **pino** — `10.3.1` | Low-overhead JSON logger for errors and the confirmation loop; the crash-proof `catch` blocks log here instead of throwing. |
| Process Engineering & Management | **PM2** | Production process manager — cluster mode, memory monitoring, zero-downtime reloads (Phase 3). |
| Container & DevOps | **Docker** (+ Docker Compose) | Multi-stage `node:22-alpine` image for the backend; Compose wires backend + frontend for local dev and staging. |

## Supporting libraries

| Component | Version | Role |
|-----------|---------|------|
| `dotenv` | `17.4.2` | Loads `TELEGRAM_BOT_TOKEN`, `BAKONG_ACCOUNT_ID`, `MERCHANT_NAME`, `SHARED_WEBHOOK_SECRET`, `PORT`. |
| `cors` | `2.8.6` | Cross-origin access for the React tester / tenant frontends. |

## Dev tooling

| Component | Version | Role |
|-----------|---------|------|
| `typescript` | `6.0.3` | Strict type checking + build (`tsc`). |
| `tsx` | `4.22.3` | Zero-config TS dev runner (`pnpm dev` = `tsx watch src/server.ts`). |
| `pino-pretty` | `13.1.3` | Human-readable log formatting in local dev only; production emits raw JSON. |
| `@types/express`, `@types/cors`, `@types/node`, `@types/bakong-khqr` | — | Type definitions for 100% type-safe surface. |

## Scripts

```
pnpm dev        # tsx watch src/server.ts
pnpm build      # tsc -> dist/
pnpm start      # node dist/server.js   (PM2 wraps this in production)
pnpm typecheck  # tsc --noEmit
```

> Note: PM2 is a Phase-3 runtime dependency installed on the server node; it is not required for local MVP development.

## Docker / DevOps

| Artifact | Purpose |
|----------|---------|
| `Dockerfile` (repo root) | Multi-stage `node:22-alpine` build — compiles TypeScript in a builder stage, copies only `dist/` + `node_modules` to the final image. |
| `docker-compose.yml` (repo root) | Wires `backend` (port 3001) and `frontend` (port 5173/80) for local dev and staging; reads `backend/.env` via `env_file`. |
| `.dockerignore` | Excludes `node_modules`, `dist`, `.env`, and source maps from the build context. |

Build & run:
```
docker build -t bakong-gateway .
docker run -p 3001:3001 --env-file backend/.env bakong-gateway
# or
docker compose up
```

> In production, Docker's `restart: unless-stopped` replaces PM2 for process supervision unless cluster mode (multi-core) is needed.

---

## Source of truth

- Stack baseline (Express 5, Node, `bakong-khqr` 1.0.20, `telegraf` 4.x) ← [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) §2 (tech baseline) and §8 (dependency footprint).
- Env variables (`TELEGRAM_BOT_TOKEN`, `BAKONG_ACCOUNT_ID`, `MERCHANT_NAME`, `SHARED_WEBHOOK_SECRET`, `PORT`) ← [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) §9 (`.env.example`).
- Installed versions verified against `backend/package.json` + `backend/pnpm-lock.yaml` (audited 2026-06-01).

> Reconciliation: `docs/ARCHITECTURE.md` §11 left npm-vs-pnpm open. That decision is now **resolved to pnpm** (installed `11.5.0`); this stack doc reflects the resolved state.
