import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKhqrBodySchema } from './types.js';

test('accepts a valid generate-khqr body', () => {
  const r = generateKhqrBodySchema.safeParse({ projectPrefix: 'LOCAL', amount: 1.5 });
  assert.equal(r.success, true);
});

test('rejects an unknown project prefix', () => {
  const r = generateKhqrBodySchema.safeParse({ projectPrefix: 'NOPE', amount: 1.5 });
  assert.equal(r.success, false);
});

test('rejects a non-positive amount', () => {
  const r = generateKhqrBodySchema.safeParse({ projectPrefix: 'AGENT', amount: 0 });
  assert.equal(r.success, false);
});
