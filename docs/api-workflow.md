# API Workflow — Central KHQR Payment Microservice

How a payment moves through the gateway, from QR generation to tenant fulfillment.

---

## 1. Components

| Component | Role |
|-----------|------|
| **Frontend Tester** (`PaymentTester.tsx`) | Generates QR, polls status. |
| **Express API** (`server.ts`) | Stateless KHQR generation + in-memory status store. |
| **KHQR module** (`khqr.ts`) | Builds EMV-compliant QR string via `bakong-khqr`. |
| **Telegram bot** (`telegram.ts`) | Listens to bank channel posts, validates credits, dispatches webhooks. |
| **PROJECT_ROUTES** (`config.ts`) | Multi-tenant prefix → target webhook URL map. |
| **Tenant SaaS apps** | AGENT / DIAG / LOCAL — receive the fulfillment POST. |

---

## 2. End-to-end sequence

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant FE as Frontend Tester
    participant API as Express API
    participant KHQR as KHQR module
    participant Store as In-memory Status Map
    participant Bank as Bank App (Telegram channel)
    participant Bot as Telegraf Bot
    participant Tenant as Tenant SaaS (PROJECT_ROUTES)

    User->>FE: Pick project + enter USD amount
    FE->>API: POST /api/generate-khqr { projectPrefix, amount }
    API->>KHQR: build billNumber = PREFIX-<timestamp>
    KHQR-->>API: qrString (EMV)
    API->>Store: set(orderId, "PENDING")
    API-->>FE: { orderId, qrString }
    FE->>FE: render QR (qrcode.react)
    loop every 3s
        FE->>API: GET /api/status/:orderId
        API-->>FE: { status }
    end

    User->>Bank: Scan QR & pay in banking app
    Bank-->>Bot: channel_post "Received $X ... PREFIX-<ts>"
    Bot->>Bot: regex guard (Received/Inward), extract prefix+amount
    Bot->>Store: set(orderId, "PAID")
    Bot->>Tenant: POST { orderId, amount, secureToken }
    Tenant-->>Bot: 200 OK

    FE->>API: GET /api/status/:orderId
    API-->>FE: { status: "PAID" }
    FE->>User: Show success ✅
```

---

## 3. Bot validation decision flow

```mermaid
flowchart TD
    A[channel_post received] --> B{matches /Received|Inward/i ?}
    B -- No --> X[Ignore: debit / system log]
    B -- Yes --> C{matches /[A-Z]+-\d+/ ?}
    C -- No --> X
    C -- Yes --> D[Extract prefix + orderId]
    D --> E{amount after '$' parsed ?}
    E -- No --> X
    E -- Yes --> F{PROJECT_ROUTES has prefix ?}
    F -- No --> X
    F -- Yes --> G[Status Map: orderId = PAID]
    G --> H[POST tenant URL\n orderId, amount, secureToken]
    H --> I{2xx response ?}
    I -- Yes --> J[Done ✅]
    I -- No --> K[Log delivery failure]
```

---

## 4. Multi-tenant routing

```mermaid
flowchart LR
    subgraph Gateway
        R[PROJECT_ROUTES map]
    end
    P1[AGENT-1717150293] -->|prefix AGENT| R
    P2[DIAG-1717150512] -->|prefix DIAG| R
    P3[LOCAL-1717150900] -->|prefix LOCAL| R
    R -->|AGENT| T1[api.agentdoc.ai/v1/payments/fulfill]
    R -->|DIAG| T2[api.diagramapp.com/api/payment/success]
    R -->|LOCAL| T3[localhost:3002/api/payment/webhook]
```

---

## 5. Endpoint reference

### `POST /api/generate-khqr`
**Request**
```json
{ "projectPrefix": "AGENT", "amount": 1.50 }
```
**Response `200`**
```json
{ "orderId": "AGENT-1717150293", "qrString": "00020101021229..." }
```
**Errors:** `400` invalid prefix or non-positive amount.

### `GET /api/status/:orderId`
**Response `200`**
```json
{ "orderId": "AGENT-1717150293", "status": "PENDING" }
```
`status` ∈ `PENDING | PAID`. Unknown orderId → `404`.

### Webhook dispatched to tenant (outbound)
```json
{ "orderId": "AGENT-1717150293", "amount": 1.50, "secureToken": "<SHARED_WEBHOOK_SECRET>" }
```
Tenant must verify `secureToken` equals its shared secret before fulfilling.

---

## 6. Lifecycle states

```mermaid
stateDiagram-v2
    [*] --> PENDING: POST /api/generate-khqr
    PENDING --> PAID: Bot validates matching credit
    PENDING --> PENDING: status poll (no payment yet)
    PAID --> [*]: Frontend shows success
```

---

## 7. Why this is database-less & reusable
- **No DB:** order state lives in a single `Map<string,'PENDING'|'PAID'>`, cleared on restart. Acceptable because each payment is short-lived (QR expiry minutes) and the source of truth is the tenant after webhook delivery.
- **Reusable:** new project = one line in `PROJECT_ROUTES`. The `orderId` prefix carries tenant identity end-to-end, so the same gateway and bot serve every team app without code changes.
