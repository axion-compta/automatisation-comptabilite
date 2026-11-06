// Canari de garde:tests : .only oublié, FAUTIF À DESSEIN (voir sans-assertion.canari.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';

test.only('canari : only oublié', () => {
  assert.equal(1, 1);
});
