import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.BAKONG_ACCOUNT_ID ??= 'tester@bank';
process.env.MERCHANT_NAME ??= 'Test Merchant';

const { generateKhqr } = await import('./khqr.js');

test('orderId is `${prefix}-${now}` with an injected clock', () => {
  const { orderId } = generateKhqr('LOCAL', 1.5, 1717150293);
  assert.equal(orderId, 'LOCAL-1717150293');
  assert.match(orderId, /^LOCAL-\d+$/);
});

test('produces a non-empty EMV qr string', () => {
  const { qrString } = generateKhqr('AGENT', 2.5, 1717150300);
  assert.equal(typeof qrString, 'string');
  assert.ok(qrString.length > 0);
});
