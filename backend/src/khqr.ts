import { BakongKHQR, type IndividualInfo } from 'bakong-khqr';
import { loadConfig } from './config.js';
import type { GenerateKhqrResponse } from './types.js';

/** ISO 4217 numeric currency code for USD (equals `khqrData.currency.usd`).
 *  Declared locally because @types/bakong-khqr exports `khqrData` as a type only. */
const USD_CURRENCY = 840;

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
  // but is absent from the @types interface; add it via an intersection type. It
  // must be a real 13-digit ms epoch in the future, so it uses wall-clock time
  // independent of the injectable `now` (which only makes orderId deterministic).
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
