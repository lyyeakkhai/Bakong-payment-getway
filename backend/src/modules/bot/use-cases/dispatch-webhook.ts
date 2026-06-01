import { PROJECT_ROUTES, loadConfig, type ProjectPrefix } from '../../../shared/config.js';
import { logger } from '../../../shared/logger.js';
import type { WebhookPayload } from '../../../shared/types.js';

const WEBHOOK_TIMEOUT_MS = 5000;
const MAX_RETRIES = 2;

type FetchLike = typeof globalThis.fetch;

/** POST the verified success webhook. Retries up to MAX_RETRIES times with backoff. Never throws. */
export async function dispatchWebhook(
  prefix: ProjectPrefix,
  orderId: string,
  amount: number,
  fetchImpl: FetchLike = globalThis.fetch,
): Promise<void> {
  const secureToken = loadConfig().SHARED_WEBHOOK_SECRET;
  if (!secureToken) {
    logger.warn({ orderId }, 'refusing to dispatch: SHARED_WEBHOOK_SECRET unset');
    return;
  }

  const body: WebhookPayload = { orderId, amount, secureToken };
  const url = PROJECT_ROUTES[prefix];

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, attempt * 1000));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
    try {
      const res = await fetchImpl(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (res.ok) return;
      logger.warn({ orderId, status: res.status, attempt }, 'webhook non-2xx response');
    } catch (err: unknown) {
      logger.error({ err, orderId, attempt }, 'webhook delivery failed');
    } finally {
      clearTimeout(timer);
    }
  }
}
