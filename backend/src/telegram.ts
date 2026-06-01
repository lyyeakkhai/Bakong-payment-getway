import { Telegraf } from 'telegraf';
import { PROJECT_ROUTES, type ProjectPrefix } from './config.js';
import { setStatus } from './store.js';
import { logger } from './logger.js';
import type { WebhookPayload } from './types.js';

type FetchLike = typeof globalThis.fetch;

const CREDIT_GUARD = /Received|Inward/i;
const TENANT = /([A-Z]+)-(\d+)/;
const AMOUNT = /\$\s*([\d,]+(?:\.\d+)?)/;
const WEBHOOK_TIMEOUT_MS = 5000;

function isProjectPrefix(prefix: string): prefix is ProjectPrefix {
  return Object.prototype.hasOwnProperty.call(PROJECT_ROUTES, prefix);
}

/** POST the verified success webhook. Never throws; logs and returns on failure. */
export async function dispatchWebhook(
  prefix: ProjectPrefix,
  orderId: string,
  amount: number,
  fetchImpl: FetchLike = globalThis.fetch,
): Promise<void> {
  const secureToken = process.env.SHARED_WEBHOOK_SECRET;
  if (!secureToken) {
    logger.warn({ orderId }, 'refusing to dispatch: SHARED_WEBHOOK_SECRET unset');
    return;
  }
  const body: WebhookPayload = { orderId, amount, secureToken };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
  try {
    const res = await fetchImpl(PROJECT_ROUTES[prefix], {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) logger.warn({ orderId, status: res.status }, 'webhook non-2xx response');
  } catch (err: unknown) {
    logger.error({ err, orderId }, 'webhook delivery failed');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Parse one channel_post text and, if it is a genuine matching credit, flip the
 * order to PAID and dispatch the tenant webhook. Crash-proof: any miss is dropped.
 */
export async function handleChannelText(text: string, fetchImpl: FetchLike = globalThis.fetch): Promise<void> {
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

/** Launch the Telegraf bot only when a token is configured (degrades gracefully). */
export function startBot(): Telegraf | undefined {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    logger.info('TELEGRAM_BOT_TOKEN unset: bot not started');
    return undefined;
  }
  const bot = new Telegraf(token);
  bot.on('channel_post', async (ctx) => {
    const post = ctx.channelPost;
    const text = post && 'text' in post ? post.text : undefined;
    if (text) await handleChannelText(text);
  });
  void bot.launch();
  return bot;
}
