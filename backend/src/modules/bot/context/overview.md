# bot module — context

Owns Telegram channel_post parsing and webhook dispatch. Event-driven, not HTTP-facing.

## Flow

```
Telegram channel_post
  → confirmPayment (use-case)
      → credit guard regex (/Received|Inward/i)
      → tenant extraction (/([A-Z]+)-(\d+)/)
      → amount extraction (/\$\s*([\d,]+(?:\.\d+)?)/)
      → store.setStatus(orderId, 'PAID')
      → dispatchWebhook (use-case)
```

## Use cases

- `confirm-payment.ts` — parses bank alert text, validates credit, flips order to PAID, calls `dispatchWebhook`. Fully crash-proof: any parse failure logs and returns, never throws.
- `dispatch-webhook.ts` — POSTs `{ orderId, amount, secureToken }` to `PROJECT_ROUTES[prefix]`. Retries up to 2× with 1s/2s backoff. Refuses to dispatch if `SHARED_WEBHOOK_SECRET` is unset.

## Infrastructure

- `telegram-bot.ts` — Telegraf setup only. Degrades gracefully when `TELEGRAM_BOT_TOKEN` is unset.

## Rules

- Run a **single bot instance** even when the HTTP API is clustered — in-memory store means duplicate instances cause duplicate webhook dispatch.
- `catch (err: unknown)` everywhere — narrow before use, log with `logger.error({ err }, ...)`.
- Never log `SHARED_WEBHOOK_SECRET` or `TELEGRAM_BOT_TOKEN`.
- Unknown tenant prefix → drop silently (never guess or dispatch to an unlisted URL).
