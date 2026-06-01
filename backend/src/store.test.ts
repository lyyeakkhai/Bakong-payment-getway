import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setStatus, getStatus } from './store.js';

test('set then get returns the stored status', () => {
  setStatus('LOCAL-1', 'PENDING');
  assert.equal(getStatus('LOCAL-1'), 'PENDING');
  setStatus('LOCAL-1', 'PAID');
  assert.equal(getStatus('LOCAL-1'), 'PAID');
});

test('unknown orderId returns undefined', () => {
  assert.equal(getStatus('DOES-NOT-EXIST'), undefined);
});
