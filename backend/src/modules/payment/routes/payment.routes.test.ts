import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.BAKONG_ACCOUNT_ID ??= 'tester@bank';
process.env.MERCHANT_NAME ??= 'Test Merchant';

const { generateKhqrHandler, statusHandler } = await import('../routes/payment.routes.js');

type Captured = { code: number; body: unknown };

function mockRes(): { res: { status: (c: number) => unknown; json: (b: unknown) => unknown }; captured: Captured } {
  const captured: Captured = { code: 0, body: undefined };
  const res = {
    status(c: number) { captured.code = c; return res; },
    json(b: unknown) { captured.body = b; return res; },
  };
  return { res, captured };
}

test('POST generate-khqr returns 400 on a bad body', () => {
  const { res, captured } = mockRes();
  generateKhqrHandler({ body: { projectPrefix: 'NOPE', amount: -1 } } as never, res as never);
  assert.equal(captured.code, 400);
});

test('POST generate-khqr returns 200 with orderId + qrString on a valid body', () => {
  const { res, captured } = mockRes();
  generateKhqrHandler({ body: { projectPrefix: 'LOCAL', amount: 1.5 } } as never, res as never);
  assert.equal(captured.code, 200);
  const body = captured.body as { orderId: string; qrString: string };
  assert.match(body.orderId, /^LOCAL-\d+$/);
  assert.ok(body.qrString.length > 0);
});

test('GET status returns 404 for an unknown orderId', () => {
  const { res, captured } = mockRes();
  statusHandler({ params: { orderId: 'LOCAL-unknown-999' } } as never, res as never);
  assert.equal(captured.code, 404);
});

test('GET status returns 200 + status for a known orderId', () => {
  const gen = mockRes();
  generateKhqrHandler({ body: { projectPrefix: 'LOCAL', amount: 2 } } as never, gen.res as never);
  const { orderId } = gen.captured.body as { orderId: string };

  const { res, captured } = mockRes();
  statusHandler({ params: { orderId } } as never, res as never);
  assert.equal(captured.code, 200);
  assert.deepEqual(captured.body, { orderId, status: 'PENDING' });
});
