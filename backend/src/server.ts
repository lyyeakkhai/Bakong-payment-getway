import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { loadConfig } from './config.js';
import { generateKhqr } from './khqr.js';
import { setStatus, getStatus } from './store.js';
import { startBot } from './telegram.js';
import { logger } from './logger.js';
import {
  generateKhqrBodySchema,
  type GenerateKhqrResponse,
  type StatusResponse,
} from './types.js';

type ErrorResponse = { error: string };

export function generateKhqrHandler(
  req: Request<Record<string, never>, GenerateKhqrResponse | ErrorResponse>,
  res: Response<GenerateKhqrResponse | ErrorResponse>,
): void {
  const parsed = generateKhqrBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid prefix or non-positive amount' });
    return;
  }
  const { projectPrefix, amount } = parsed.data;
  const { orderId, qrString } = generateKhqr(projectPrefix, amount);
  setStatus(orderId, 'PENDING');
  res.status(200).json({ orderId, qrString });
}

export function statusHandler(
  req: Request<{ orderId: string }, StatusResponse | ErrorResponse>,
  res: Response<StatusResponse | ErrorResponse>,
): void {
  const { orderId } = req.params;
  const status = getStatus(orderId);
  if (!status) {
    res.status(404).json({ error: 'unknown orderId' });
    return;
  }
  res.status(200).json({ orderId, status });
}

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.post('/api/generate-khqr', generateKhqrHandler);
  app.get('/api/status/:orderId', statusHandler);
  return app;
}

// Boot only when run directly (not when imported by tests).
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const { PORT } = loadConfig();
  startBot();
  createApp().listen(PORT, () => logger.info({ PORT }, 'gateway listening'));
}
