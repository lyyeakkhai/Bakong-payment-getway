import { BakongKHQR, khqrData, type IndividualInfo } from 'bakong-khqr';
import { loadConfig } from './config.js';
import type { GenerateKhqrResponse } from './types.js';

function hasQr(data: unknown): data is { qr: string } {
  return typeof data === 'object' && data !== null && typeof (data as { qr?: unknown }).qr === 'string';
}

/**
 * Pure, stateless KHQR string builder.
 * orderId = `${prefix}-${now}` and is used as the billNumber so the tenant
 * prefix travels end-to-end for later regex matching.
 */
export function generateKhqr(prefix: string, amount: number, now: number = Date.now()): GenerateKhqrResponse {
  const { BAKONG_ACCOUNT_ID, MERCHANT_NAME } = loadConfig();
  const orderId = `${prefix}-${now}`;

  // `expirationTimestamp` is required at runtime for dynamic (amount-bearing) KHQR
  // but is absent from the @types interface; add it via an intersection type.
  const info: IndividualInfo & { expirationTimestamp: number } = {
    bakongAccountID: BAKONG_ACCOUNT_ID,
    merchantName: MERCHANT_NAME,
    merchantCity: 'Phnom Penh',
    acquiringBank: MERCHANT_NAME,
    currency: khqrData.currency.usd,
    amount,
    billNumber: orderId,
    expirationTimestamp: now + 5 * 60 * 1000,
  };

  const res = new BakongKHQR().generateIndividual(info);
  if (!hasQr(res.data)) {
    throw new Error(`KHQR generation failed: ${res.status.message ?? 'unknown error'}`);
  }
  return { orderId, qrString: res.data.qr };
}
