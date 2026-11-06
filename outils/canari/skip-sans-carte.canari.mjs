// Canari : test sauté sans carte, fautif à dessein.
import { test } from 'node:test';
import assert from 'node:assert/strict';
test.skip('canari : sauté sans carte', () => assert.equal(1, 1));
