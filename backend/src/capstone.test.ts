import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.BAKONG_ACCOUNT_ID ??= 'tester@bank';
process.env.MERCHANT_NAME ??= 'Test Merchant';
process.env.SHARED_WEBHOOK_SECRET = 'capstone-secret';

const { generateKhqr } = await import('./modules/payment/infrastructure/khqr-adapter.js');
const { setStatus, getStatus } = await import('./shared/store.js');
const { confirmPayment } = await import('./modules/bot/use-cases/confirm-payment.js');

test('capstone: generate LOCAL order, simulate credit, assert PAID + LOCAL webhook', async () => {
  const { orderId, qrString } = generateKhqr('LOCAL', 3.75, 1717150293);
  setStatus(orderId, 'PENDING');
  assert.equal(orderId, 'LOCAL-1717150293');
  assert.ok(qrString.length > 0);
  assert.equal(getStatus(orderId), 'PENDING');

  const calls: { url: string; body: unknown }[] = [];
  const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), body: JSON.parse(String(init?.body)) });
    return new Response('ok', { status: 200 });
  }) as typeof globalThis.fetch;

  await confirmPayment(`Received $3.75 to your account — ref ${orderId}`, fetchImpl);

  assert.equal(getStatus(orderId), 'PAID');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'http://localhost:3002/api/payment/webhook');
  assert.deepEqual(calls[0].body, { orderId, amount: 3.75, secureToken: 'capstone-secret' });
});
