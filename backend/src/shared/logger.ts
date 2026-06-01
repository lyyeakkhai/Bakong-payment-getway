import { pino } from 'pino';

/** Shared structured logger. Secrets are redacted so they can never be logged. */
export const logger = pino({
  redact: ['SHARED_WEBHOOK_SECRET', 'TELEGRAM_BOT_TOKEN', 'secureToken', '*.secureToken'],
});
