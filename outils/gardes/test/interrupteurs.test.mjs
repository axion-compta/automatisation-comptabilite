import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyserInterrupteurs } from '../interrupteurs.mjs';

const reel = () => JSON.parse(readFileSync('packages/contrat/src/actions/registre.json', 'utf8'));

test('vert : le registre réel est conforme', () => {
  assert.deepEqual(analyserInterrupteurs(reel()), []);
});

test('rouge : action sans interrupteur', () => {
  const r = reel();
  delete r.actions[0].interrupteur;
  assert.ok(analyserInterrupteurs(r).some((p) => p.includes('sans interrupteur')));
});

test('rouge : interrupteur non déclaré', () => {
  const r = reel();
  r.actions[0].interrupteur = 'fantome';
  assert.ok(analyserInterrupteurs(r).some((p) => p.includes('non déclaré')));
});

test('rouge : interrupteur déclaré sans action', () => {
  const r = reel();
  r.interrupteurs.push('inutile');
  assert.ok(analyserInterrupteurs(r).some((p) => p.includes('sans action')));
});
