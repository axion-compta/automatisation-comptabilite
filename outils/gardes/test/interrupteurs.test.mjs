import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyserInterrupteurs } from '../interrupteurs.mjs';
import { CHEMIN_REGISTRE } from '../actions.mjs';

const reel = () => JSON.parse(readFileSync(CHEMIN_REGISTRE, 'utf8'));
const rouge = (r, texte) => assert.ok(analyserInterrupteurs(r).some((p) => p.includes(texte)), texte);

test('vert : le registre réel est conforme', () => {
  assert.deepEqual(analyserInterrupteurs(reel()), []);
});

test('rouge : action sans interrupteur', () => {
  const r = reel();
  delete r.actions[0].interrupteur;
  rouge(r, 'sans interrupteur');
});

test('rouge : interrupteur non déclaré', () => {
  const r = reel();
  r.actions[0].interrupteur = 'fantome';
  rouge(r, 'non déclaré');
});

test('rouge : interrupteur déclaré sans action', () => {
  const r = reel();
  r.interrupteurs.inutile = { actif_par_defaut: false };
  rouge(r, 'sans action');
});

test('rouge : interrupteur actif par défaut', () => {
  const r = reel();
  r.interrupteurs.lecture.actif_par_defaut = true;
  rouge(r, 'actif par défaut');
});

test('rouge : interrupteur sans état', () => {
  const r = reel();
  r.interrupteurs.lecture = {};
  rouge(r, 'sans état');
});
