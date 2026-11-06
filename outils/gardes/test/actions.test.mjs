import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyserActions, CHEMIN_REGISTRE } from '../actions.mjs';

const reel = () => JSON.parse(readFileSync(CHEMIN_REGISTRE, 'utf8'));
const rouge = (r, texte) => assert.ok(analyserActions(r).some((p) => p.includes(texte)), texte);

test('vert : le registre réel est conforme', () => {
  assert.deepEqual(analyserActions(reel()), []);
});

test('rouge : action sans outil ni exclusion', () => {
  const r = reel();
  r.actions.push({ id: 'orpheline', interrupteur: 'lecture' });
  rouge(r, 'sans outil ni exclusion');
});

test('rouge : action avec outil et exclusion', () => {
  const r = reel();
  r.actions[0].exclusion = 'x';
  rouge(r, 'avec outil et exclusion');
});

test('rouge : action en double', () => {
  const r = reel();
  r.actions.push({ ...r.actions[0] });
  rouge(r, 'en double');
});

test('rouge : action sans id', () => {
  const r = reel();
  r.actions.push({ interrupteur: 'lecture', outil: 'outil_lire' });
  rouge(r, 'action sans id');
});

test('rouge : outil inconnu et outil sans action', () => {
  const r = reel();
  r.actions[0].outil = 'outil_fantome';
  rouge(r, 'outil inconnu');
  rouge(r, 'outil sans action');
});

test('rouge : doublon dans roles et dans outils', () => {
  const r = reel();
  r.roles.push({ ...r.roles[0] });
  r.outils.push({ ...r.outils[0] });
  rouge(r, 'doublon dans roles');
  rouge(r, 'doublon dans outils');
});

test('rouge : outil sans niveau L ou E', () => {
  const r = reel();
  delete r.outils[0].niveau;
  rouge(r, 'sans niveau');
});

test('rouge : matrice avec rôle ou outil inconnu', () => {
  const r = reel();
  r.matrice.intrus = ['outil_lire', 'outil_x'];
  rouge(r, 'rôle inconnu');
  rouge(r, 'outil inconnu pour intrus');
});

test('rouge : matrice, rôle sans ligne', () => {
  const r = reel();
  delete r.matrice.lecture;
  rouge(r, 'rôle sans ligne : lecture');
});

test('rouge : matrice, ligne non-liste (message clair, pas d exception)', () => {
  const r = reel();
  r.matrice.lecture = 'outil_lire';
  rouge(r, "n'est pas une liste");
});

test('rouge : matrice, outil répété dans une ligne', () => {
  const r = reel();
  r.matrice.lecture = ['outil_lire', 'outil_lire'];
  rouge(r, 'outil répété');
});

test("rouge : rôle en lecture seule avec un outil d'écriture", () => {
  const r = reel();
  r.matrice.lecture.push('outil_proposer');
  rouge(r, "lecture seule avec un outil d'écriture");
});

test('clés héritées : rôle « constructor » sans ligne, sans exception', () => {
  const r = reel();
  r.roles.push({ id: 'constructor', lecture_seule: true });
  rouge(r, 'rôle sans ligne : constructor');
});
