import { BakongKHQR, type IndividualInfo } from 'bakong-khqr';
import { loadConfig } from '../../../shared/config.js';
import type { GenerateKhqrResponse } from '../../../shared/types.js';

const USD_CURRENCY = 840;

function hasQr(data: unknown): data is { qr: string } {
  return typeof data === 'object' && data !== null && typeof (data as { qr?: unknown }).qr === 'string';
}

function crc16(str: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) > 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
  }
  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
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
    acquiringBank: 'ABA Bank', // Must be valid acquiring bank string on network
    currency: USD_CURRENCY,
    amount,
    billNumber: orderId,
    expirationTimestamp: Date.now() + 5 * 60 * 1000,
  };

  const res = new BakongKHQR().generateIndividual(info);
  if (!hasQr(res.data)) {
    throw new Error(`KHQR generation failed: ${res.status.message ?? 'unknown error'}`);
  }
  
  let qrString = res.data.qr;
  
  // Inject ABA Proprietary Tag 40 if this is the ABA proxy ID
  if (BAKONG_ACCOUNT_ID === 'abaakhppxxx@abaa') {
    // Strip the last 8 characters (6304 + 4 digit CRC)
    qrString = qrString.slice(0, -8);
    // Add the exact ABA Tag 40 from user reference
    qrString += '40600006abaP2P0112A73C5FCF0E5C020900691108103090069110800404Dual';
    // Append 6304 and recalculate CRC
    qrString += '6304';
    qrString += crc16(qrString);
  }
  
  return { orderId, qrString };
}
