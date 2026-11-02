import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyserActions, CHEMIN_REGISTRE } from '../actions.mjs';

const reel = () => JSON.parse(readFileSync(CHEMIN_REGISTRE, 'utf8'));

test('vert : le registre réel est conforme', () => {
  assert.deepEqual(analyserActions(reel()), []);
});

test('rouge : action sans outil ni exclusion', () => {
  const r = reel();
  r.actions.push({ id: 'orpheline', interrupteur: 'lecture' });
  assert.ok(analyserActions(r).some((p) => p.includes('sans outil ni exclusion')));
});

test('rouge : action en double', () => {
  const r = reel();
  r.actions.push({ ...r.actions[0] });
  assert.ok(analyserActions(r).some((p) => p.includes('en double')));
});

test('rouge : outil inconnu et outil sans action', () => {
  const r = reel();
  r.actions[0].outil = 'outil_fantome';
  const pb = analyserActions(r);
  assert.ok(pb.some((p) => p.includes('outil inconnu')));
  assert.ok(pb.some((p) => p.includes('outil sans action')));
});

test('rouge : matrice avec rôle ou outil inconnu', () => {
  const r = reel();
  r.matrice.intrus = ['outil_lire', 'outil_x'];
  const pb = analyserActions(r);
  assert.ok(pb.some((p) => p.includes('rôle inconnu')));
  assert.ok(pb.some((p) => p.includes('outil inconnu pour intrus')));
});
