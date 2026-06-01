import { type Request, type Response, Router } from 'express';
import { generateKhqrBodySchema, type GenerateKhqrResponse, type StatusResponse } from '../../../shared/types.js';
import { generatePayment } from '../use-cases/generate-payment.js';
import { getPaymentStatus } from '../use-cases/get-payment-status.js';
import { confirmPayment } from '../../bot/use-cases/confirm-payment.js';

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
  const result = generatePayment(parsed.data);
  res.status(200).json(result);
}

export function statusHandler(
  req: Request<{ orderId: string }, StatusResponse | ErrorResponse>,
  res: Response<StatusResponse | ErrorResponse>,
): void {
  const result = getPaymentStatus(req.params.orderId);
  if (!result) {
    res.status(404).json({ error: 'unknown orderId' });
    return;
  }
  res.status(200).json(result);
}

export const paymentRouter = Router();
paymentRouter.post('/generate-khqr', generateKhqrHandler);
paymentRouter.get('/status/:orderId', statusHandler);
paymentRouter.post('/internal/confirm', async (req, res) => {
  const { text } = req.body;
  if (text) await confirmPayment(text);
  res.status(200).json({ ok: true });
});
