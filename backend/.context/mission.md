# Mission — Cambodia Payment Proxy Microservice

## Engineering mission

This `backend/` folder is a **stateless, database-less, multi-tenant "Cambodia Payment Proxy Microservice"** built on **Express (TypeScript, ESM)**. It is not part of any single product. It is a shared, isolated gateway that every team SaaS app (AgentDoc AI, Diagram AI, and future projects) calls to accept Bakong **KHQR** payments.

The service exists to do exactly two things, and nothing else:

1. **Centralize dynamic KHQR string compilation.**
   On `POST /api/generate-khqr`, it compiles an EMV-compliant KHQR payload using the **`bakong-khqr`** SDK layout (`IndividualInfo` → `BakongKHQR.generateIndividual`). Each request mints a dynamic `billNumber` of the form `PREFIX-<timestamp>` (e.g. `AGENT-1717150293`) that carries the calling tenant's identity end-to-end.

2. **Automate transaction confirmation loops via a Telegram alert bridge.**
   A **Telegraf** bot listens to the Cambodian banking app's broadcast channel (`channel_post`), parses the alert text, validates that it is a genuine incoming credit, extracts the tenant prefix and paid amount, and forwards a **verified success webhook** to the correct external app resolved from the `PROJECT_ROUTES` map.

## What "database-less" means here

- The only state is a single in-memory `Map<string, 'PENDING' | 'PAID'>` keyed by `orderId`.
- State is intentionally ephemeral: KHQR payloads are short-lived (minutes until expiry), and the **source of truth after confirmation is the tenant app**, not this gateway.
- No SQL, no Redis, no persistence layer. A restart clears in-flight orders by design.

## What this service is explicitly NOT

- Not an order/customer store — tenants persist their own orders.
- Not a fulfillment engine — it only signals "paid" via webhook; the tenant fulfills.
- Not coupled to any one product — adding a tenant is a **one-line** change in `PROJECT_ROUTES`.

## Boundary contract (summary)

| Direction | Channel | Payload |
|-----------|---------|---------|
| Inbound (tenant → gateway) | `POST /api/generate-khqr` | `{ projectPrefix, amount }` → `{ orderId, qrString }` |
| Inbound (tenant → gateway) | `GET /api/status/:orderId` | → `{ orderId, status }` |
| Outbound (gateway → tenant) | tenant webhook from `PROJECT_ROUTES` | `{ orderId, amount, secureToken }` |

Full diagrams and integration details live in [`../../docs/api-workflow.md`](../../docs/api-workflow.md) and [`../../docs/system-workflow.md`](../../docs/system-workflow.md).

---

## Source of truth

This file is derived from and must stay consistent with:

- [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) §1–§6 — database-less design, `PROJECT_ROUTES`, KHQR generation, endpoints, bot flow.
- [`../../docs/api-workflow.md`](../../docs/api-workflow.md) §1, §5, §7 — components, endpoint reference, "why database-less & reusable".
- [`../../docs/system-workflow.md`](../../docs/system-workflow.md) §1–§3, §7 — tenant integration contract and responsibility split.
