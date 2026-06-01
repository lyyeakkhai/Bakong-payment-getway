# Central KHQR Payment Microservice — Architecture Plan

> Database-less, in-memory, multi-tenant payment proxy gateway for Cambodian Bakong KHQR.
> Strictly TypeScript (`.ts` / `.tsx`). No `.js` source files.

---

## 1. Verified facts (audited 2026-06-01)

- Workspace currently contains only `README.md` + `.git`. **No prior scaffolding exists** — we build from scratch.
- Toolchain on machine: **Node v26.2.0**, **npm 11.13.0**, **pnpm not installed**.
  - The brief says `pnpm add ...`. We will use **npm** (already present) to avoid a global install step. Commands are translated 1:1 below. If you prefer pnpm, say so and I'll `corepack enable` first.
- KHQR SDK: **`bakong-khqr@1.0.20`** + **`@types/bakong-khqr`** (DefinitelyTyped). Confirmed exports:
  `BakongKHQR, khqrData, IndividualInfo, MerchantInfo, SourceInfo`.
  - Generate: `new BakongKHQR().generateIndividual(individualInfo)` → `{ data: { qr, md5 } }`.
  - `IndividualInfo(bakongAccountId, currency, merchantName, merchantCity, optionalData)`.
  - `optionalData`: `{ currency, amount, billNumber, expirationTimestamp, ... }`.

## 2. Latest tech baseline

| Layer    | Choice                                  |
|----------|-----------------------------------------|
| Backend  | Express 5 + TypeScript 5.x (ESM, NodeNext) |
| Runtime  | Node 26, `tsx` for dev, `tsc` for build |
| KHQR     | `bakong-khqr` 1.0.20                     |
| Bot      | `telegraf` 4.x                          |
| Validation | `zod` 4.x (runtime request/env validation) |
| Logging  | `pino` 10.x (+ `pino-pretty` dev)        |
| Frontend | React 19 + Vite 7 + Tailwind CSS v4     |
| QR UI    | `qrcode.react`, `lucide-react`          |

## 3. Repository layout

```
Bakong-payment-getway/
├── docs/
│   └── ARCHITECTURE.md            # this file
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── src/
│       ├── types.ts               # shared request/response/webhook types
│       ├── config.ts              # PROJECT_ROUTES map + env loading
│       ├── khqr.ts                # KHQR string generation (stateless)
│       ├── telegram.ts            # Telegraf bot: channel_post parsing + webhook dispatch
│       └── server.ts              # Express entry: wires routes + boots bot
└── frontend/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── index.css              # Tailwind v4 single-line import
        └── components/
            └── PaymentTester.tsx
```

> Note: I split the backend into small modules (`config`, `khqr`, `telegram`, `server`) instead of one giant `server.ts`. This keeps the multi-tenant map and bot logic independently testable and is the production-grade choice. `server.ts` stays the single entry point.

## 4. Multi-tenancy contract

```ts
// backend/src/config.ts
export const PROJECT_ROUTES: Record<string, string> = {
  AGENT: 'https://api.agentdoc.ai/v1/payments/fulfill',
  DIAG:  'https://api.diagramapp.com/api/payment/success',
  LOCAL: 'http://localhost:3002/api/payment/webhook',
};
```

Adding a tenant = **one line**. `ProjectPrefix = keyof typeof PROJECT_ROUTES` is derived so the type system updates automatically.

## 5. Backend API surface

### `POST /api/generate-khqr`
- Body (strict): `{ projectPrefix: 'AGENT' | 'DIAG' | 'LOCAL'; amount: number }`
- Steps: validate prefix+amount → `billNumber = \`${prefix}-${Date.now()}\`` → build `IndividualInfo` → `generateIndividual` → return `{ orderId, qrString }`.
- `orderId === billNumber` (carries the tenant prefix for later regex matching).

### `GET /api/status/:orderId`
- In-memory `Map<string, 'PENDING' | 'PAID'>`. Frontend polls this every 3s.
- Seeded `PENDING` at generation; flipped to `PAID` when the bot validates a matching credit.

## 6. Telegram bot flow (`telegram.ts`)

1. `bot.on('channel_post', ...)` reads broadcast text.
2. Guard: text must match `/Received|Inward/i`; reject debits/system logs.
3. Extract tenant: `/([A-Z]+)-(\d+)/` → `orderId` + prefix.
4. Extract amount: regex after `$`, e.g. `/\$\s*([\d,]+(?:\.\d+)?)/` → `parseFloat`.
5. Look up `PROJECT_ROUTES[prefix]`; if present, mark status `PAID` and POST:
   `{ orderId, amount, secureToken: SHARED_WEBHOOK_SECRET }`.

> Security note: `secureToken` is a shared secret sent in the body. I'll also send it as an `Authorization`-style header is optional; brief specifies body schema, so body it is. Bot only runs if `TELEGRAM_BOT_TOKEN` is set (degrades gracefully otherwise).

## 7. Frontend (`PaymentTester.tsx`)

- Two-column responsive Tailwind grid.
- Left: project buttons (AGENT/DIAG/LOCAL), USD amount input, submit.
- Right: status block → on submit calls `/api/generate-khqr`, renders `<QRCodeSVG value={qrString}/>`, starts `setInterval` polling `/api/status/:orderId` every 3s, stops + shows success when `PAID`. `clearInterval` on unmount/new request.
- Vite dev proxy: `/api` → `http://localhost:3001`.

## 8. Dependency footprint

Backend (`backend/`):
```
npm i express bakong-khqr telegraf dotenv cors zod pino
npm i -D typescript @types/express @types/cors @types/node @types/bakong-khqr tsx pino-pretty
```
Frontend (`frontend/`):
```
npm create vite@latest . -- --template react-ts   # or manual scaffold
npm i qrcode.react lucide-react
npm i -D tailwindcss @tailwindcss/vite
```

## 9. `.env.example`
```
TELEGRAM_BOT_TOKEN=
BAKONG_ACCOUNT_ID=your_name@bank
MERCHANT_NAME=Your Merchant
SHARED_WEBHOOK_SECRET=
PORT=3001
```

## 10. Build order & verification

1. `docs/ARCHITECTURE.md` (this) ✅
2. Backend: `package.json`, `tsconfig.json`, install deps.
3. Backend src: `types.ts` → `config.ts` → `khqr.ts` → `telegram.ts` → `server.ts`.
4. `.env.example`.
5. `cd backend && npx tsc --noEmit` (type-check gate).
6. Frontend: scaffold, configure Tailwind v4 + proxy, install deps.
7. Frontend src: `index.css` → `PaymentTester.tsx` → `App.tsx` → `main.tsx`.
8. `cd frontend && npx tsc --noEmit && npx vite build` (type-check + build gate).

## 11. Decisions needing your nod (non-blocking)
- **npm instead of pnpm** (pnpm not installed). OK?
- KHQR **Individual** generation (most common for personal Bakong accounts). Switch to Merchant if you have a merchant account ID.
- Status tracking added (`/api/status`) because the frontend brief requires polling "until complete" — the brief didn't spec the endpoint, so I designed the minimal in-memory one.
