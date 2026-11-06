// Canari : .only oublié, fautif à dessein.
import { test } from 'node:test';
import assert from 'node:assert/strict';
test.only('canari : only oublié', () => assert.equal(1, 1));
