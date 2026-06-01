import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.BAKONG_ACCOUNT_ID ??= 'tester@bank';
process.env.MERCHANT_NAME ??= 'Test Merchant';
process.env.SHARED_WEBHOOK_SECRET = 'secret-123';

const { handleChannelText } = await import('./telegram.js');
const { getStatus } = await import('./store.js');

type Call = { url: string; body: unknown };

function mockFetch(): { fetch: typeof globalThis.fetch; calls: Call[] } {
  const calls: Call[] = [];
  const fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), body: JSON.parse(String(init?.body)) });
    return new Response('ok', { status: 200 });
  }) as typeof globalThis.fetch;
  return { fetch, calls };
}

test('drops a debit / non-credit message without dispatch', async () => {
  const { fetch, calls } = mockFetch();
  await handleChannelText('Debit $5.00 ref LOCAL-111', fetch);
  assert.equal(calls.length, 0);
  assert.equal(getStatus('LOCAL-111'), undefined);
});

test('drops a credit with no $ amount', async () => {
  const { fetch, calls } = mockFetch();
  await handleChannelText('Received payment for LOCAL-222', fetch);
  assert.equal(calls.length, 0);
  assert.equal(getStatus('LOCAL-222'), undefined);
});

test('drops an unknown tenant prefix', async () => {
  const { fetch, calls } = mockFetch();
  await handleChannelText('Received $1.00 for NOPE-333', fetch);
  assert.equal(calls.length, 0);
  assert.equal(getStatus('NOPE-333'), undefined);
});

test('does not throw on malformed input', async () => {
  const { fetch } = mockFetch();
  await assert.doesNotReject(() => handleChannelText('', fetch));
});

test('valid LOCAL credit flips PAID and dispatches the webhook once', async () => {
  const { fetch, calls } = mockFetch();
  await handleChannelText('Received $1,250.50 to account, ref LOCAL-444', fetch);
  assert.equal(getStatus('LOCAL-444'), 'PAID');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'http://localhost:3002/api/payment/webhook');
  assert.deepEqual(calls[0].body, { orderId: 'LOCAL-444', amount: 1250.5, secureToken: 'secret-123' });
});
