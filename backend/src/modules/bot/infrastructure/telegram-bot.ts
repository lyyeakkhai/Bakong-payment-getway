import { Telegraf } from 'telegraf';
import { loadConfig } from '../../../shared/config.js';
import { logger } from '../../../shared/logger.js';
import { confirmPayment } from '../use-cases/confirm-payment.js';

/** Launch the Telegraf bot only when a token is configured (degrades gracefully). */
export function startBot(): Telegraf | undefined {
  const token = loadConfig().TELEGRAM_BOT_TOKEN;
  if (!token) {
    logger.info('TELEGRAM_BOT_TOKEN unset: bot not started');
    return undefined;
  }
  const bot = new Telegraf(token);
  bot.on(['channel_post', 'message'], async (ctx) => {
    const post = ctx.channelPost || ctx.message;
    const text = post && 'text' in post ? post.text : undefined;
    logger.info({ text }, 'Received incoming Telegram message');
    if (text) await confirmPayment(text);
  });
  bot.launch().then(() => {
    logger.info('Telegram Bot successfully connected and polling!');
  }).catch(err => {
    logger.error({ err }, 'Telegram Bot failed to launch');
  });
  return bot;
}
