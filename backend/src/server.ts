import express from 'express';
import cors from 'cors';
import { loadConfig } from './shared/config.js';
import { paymentRouter } from './modules/payment/routes/payment.routes.js';
import { startBot } from './modules/bot/infrastructure/telegram-bot.js';
import { logger } from './shared/logger.js';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api', paymentRouter);
  return app;
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const { PORT } = loadConfig();
  startBot();
  createApp().listen(PORT, () => logger.info({ PORT }, 'gateway listening'));
}
