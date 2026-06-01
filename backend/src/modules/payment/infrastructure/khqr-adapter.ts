import { BakongKHQR, type IndividualInfo } from 'bakong-khqr';
import { loadConfig } from '../../../shared/config.js';
import type { GenerateKhqrResponse } from '../../../shared/types.js';

const USD_CURRENCY = 840;

function hasQr(data: unknown): data is { qr: string } {
  return typeof data === 'object' && data !== null && typeof (data as { qr?: unknown }).qr === 'string';
}

/** Pure, stateless KHQR string builder. */
export function generateKhqr(prefix: string, amount: number, now: number = Date.now()): GenerateKhqrResponse {
  const { BAKONG_ACCOUNT_ID, MERCHANT_NAME } = loadConfig();
  const orderId = `${prefix}-${now}`;

  // `expirationTimestamp` is required at runtime for dynamic KHQR but absent from @types
  const info: IndividualInfo & { expirationTimestamp: number } = {
    bakongAccountID: BAKONG_ACCOUNT_ID,
    merchantName: MERCHANT_NAME,
    merchantCity: 'Phnom Penh',
    acquiringBank: MERCHANT_NAME,
    currency: USD_CURRENCY,
    amount,
    billNumber: orderId,
    expirationTimestamp: Date.now() + 5 * 60 * 1000,
  };

  const res = new BakongKHQR().generateIndividual(info);
  if (!hasQr(res.data)) {
    throw new Error(`KHQR generation failed: ${res.status.message ?? 'unknown error'}`);
  }
  return { orderId, qrString: res.data.qr };
}
