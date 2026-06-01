import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseEnv, PROJECT_ROUTES } from './config.js';

test('parseEnv fails when a required var is missing', () => {
  assert.throws(() => parseEnv({ MERCHANT_NAME: 'X' } as NodeJS.ProcessEnv));
});

test('parseEnv accepts a valid env and defaults PORT', () => {
  const cfg = parseEnv({ BAKONG_ACCOUNT_ID: 'me@bank', MERCHANT_NAME: 'Me' } as NodeJS.ProcessEnv);
  assert.equal(cfg.PORT, 3001);
});

test('PROJECT_ROUTES resolves a known prefix to its URL', () => {
  assert.equal(PROJECT_ROUTES.LOCAL, 'http://localhost:3002/api/payment/webhook');
});
