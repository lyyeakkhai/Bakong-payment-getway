import { PROJECT_ROUTES, type ProjectPrefix } from '../../../shared/config.js';
import { setStatus } from '../../../shared/store.js';
import { logger } from '../../../shared/logger.js';
import { dispatchWebhook } from './dispatch-webhook.js';

const CREDIT_GUARD = /Received|Inward/i;
const TENANT = /([A-Z]+)-(\d+)/;
const AMOUNT = /\$\s*([\d,]+(?:\.\d+)?)/;

function isProjectPrefix(prefix: string): prefix is ProjectPrefix {
  return Object.prototype.hasOwnProperty.call(PROJECT_ROUTES, prefix);
}

type FetchLike = typeof globalThis.fetch;

/** Parse one channel_post text; flip order PAID and dispatch webhook on match. */
export async function confirmPayment(text: string, fetchImpl: FetchLike = globalThis.fetch): Promise<void> {
  try {
    if (!CREDIT_GUARD.test(text)) return;

    const tenant = TENANT.exec(text);
    if (!tenant) return;
    const orderId = tenant[0];
    const prefix = tenant[1];
    if (!isProjectPrefix(prefix)) return;

    const amountMatch = AMOUNT.exec(text);
    if (!amountMatch) return;
    const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    if (!Number.isFinite(amount)) return;

    setStatus(orderId, 'PAID');
    await dispatchWebhook(prefix, orderId, amount, fetchImpl);
  } catch (err: unknown) {
    logger.error({ err }, 'failed to handle channel_post');
  }
}
