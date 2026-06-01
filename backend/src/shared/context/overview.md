# shared — context

Cross-cutting contracts used by both modules. No business logic lives here.

## Files

- `types.ts` — Zod schemas + inferred TS types for all HTTP request/response shapes and the `WebhookPayload`. Single source of truth.
- `config.ts` — `PROJECT_ROUTES` map (tenant prefix → webhook URL), env validation via Zod, `ProjectPrefix` type. **Adding a tenant = one line here.**
- `store.ts` — In-memory `Map<string, 'PENDING'|'PAID'>` with typed accessors. The only shared mutable state between the payment module and the bot module.
- `logger.ts` — Shared pino logger with `secureToken` and bot token redacted.

## Invariants

- `store` is the single seam between modules — never reach into it directly from both modules with ad-hoc logic.
- `ProjectPrefix = keyof typeof PROJECT_ROUTES` — never use a loose `string` for tenant prefixes.
- All inbound data must be validated with Zod before use; derive TS types with `z.infer`.
