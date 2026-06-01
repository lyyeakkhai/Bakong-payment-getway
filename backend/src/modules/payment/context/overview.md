# payment module — context

Owns KHQR generation and order status. HTTP-facing.

## API surface

| Method | Path | Handler |
|--------|------|---------|
| POST | `/api/generate-khqr` | `generateKhqrHandler` |
| GET | `/api/status/:orderId` | `statusHandler` |

## Use cases

- `generate-payment.ts` — validates input, calls `khqr-adapter`, seeds store as `PENDING`, returns `{ orderId, qrString }`.
- `get-payment-status.ts` — reads store, returns `{ orderId, status }` or `undefined`.

## Infrastructure

- `khqr-adapter.ts` — wraps `bakong-khqr` SDK. Pure and stateless. `orderId = PREFIX-<timestamp>` travels end-to-end as `billNumber` for bot regex matching.

## Rules

- Routes are thin: validate → call use case → return response. No business logic in routes.
- `generateKhqr` throws on SDK failure — the route handler does not catch this (let Express 5 handle it).
- `expirationTimestamp` uses real wall-clock time (not the injectable `now`) — required by the KHQR spec for dynamic QR codes.
