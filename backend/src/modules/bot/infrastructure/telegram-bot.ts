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
  bot.on('channel_post', async (ctx) => {
    const post = ctx.channelPost;
    const text = post && 'text' in post ? post.text : undefined;
    if (text) await confirmPayment(text);
  });
  void bot.launch();
  return bot;
}
