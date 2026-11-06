// Canari de garde:tests : test sauté sans carte, FAUTIF À DESSEIN (voir sans-assertion.canari.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';

test.skip('canari : sauté sans carte', () => {
  assert.equal(1, 1);
});
