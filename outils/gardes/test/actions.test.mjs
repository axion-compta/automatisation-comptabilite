import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyserActions, CHEMIN_REGISTRE } from '../actions.mjs';

const reel = () => JSON.parse(readFileSync(CHEMIN_REGISTRE, 'utf8'));
const rouge = (r, texte) => assert.ok(analyserActions(r).some((p) => p.includes(texte)), texte);

test('vert : le registre réel est vert', () => {
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

test('rouge : outil sans niveau', () => {
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

test('rouge : comptable sans lecture_seule', () => {
  const r = reel();
  delete r.roles.find((x) => x.id === 'comptable').lecture_seule;
  rouge(r, 'comptable sans lecture_seule');
});

test("rouge : comptable avec un outil d'écriture", () => {
  const r = reel();
  r.matrice.comptable.push('outil_proposer');
  rouge(r, "comptable avec un outil d'écriture");
});

test('quatre-niveaux-seulement', () => {
  const r = reel();
  assert.deepEqual([...new Set(r.outils.map((o) => o.niveau))].sort(), ['B', 'L', 'M']);
  r.outils[0].niveau = 'E';
  rouge(r, 'sans niveau L, B, M ou I');
});

test('lecture-seule-niveau-l', () => {
  for (const niveau of ['B', 'M', 'I']) {
    const r = reel();
    r.outils.find((o) => o.id === 'outil_lister').niveau = niveau;
    rouge(r, "lecture seule avec un outil d'écriture");
  }
});

test('niveau-i-ferme-au-chat', () => {
  const r = reel();
  const o = r.outils.find((x) => x.id === 'outil_valider');
  o.niveau = 'I';
  assert.deepEqual(analyserActions(r), []);
  o.chat = 'ouvert';
  rouge(r, 'niveau I ouvert au chat');
});

test('chat-absent-rouge', () => {
  for (const v of [undefined, '', 'Ouvert', null]) {
    const r = reel();
    r.outils[0].chat = v;
    rouge(r, 'sans champ chat');
  }
});

test('trois-exclusions-ecrites', () => {
  for (const id of ['double_facteur', 'mot_de_passe', 'administration_axion']) {
    const r = reel();
    assert.ok(r.actions.find((a) => a.id === id)?.exclusion);
    r.actions = r.actions.filter((a) => a.id !== id);
    rouge(r, `exclusion écrite manquante : ${id}`);
    const r2 = reel();
    delete r2.actions.find((a) => a.id === id).exclusion;
    rouge(r2, `exclusion écrite manquante : ${id}`);
  }
});

test('hors-ue-interdit', () => {
  const r = reel();
  r.actions.push({ id: 'ia.autoriser_hors_ue', interrupteur: 'ecriture', exclusion: 'x' });
  rouge(r, 'action interdite : ia.autoriser_hors_ue');
  const r2 = reel();
  r2.outils.push({ id: 'ia.autoriser_hors_ue', niveau: 'L', chat: 'ferme' });
  rouge(r2, 'outil interdit : ia.autoriser_hors_ue');
});

test('niveau-vide-ou-minuscule-rouge', () => {
  for (const v of ['', 'b', null]) {
    const r = reel();
    r.outils[0].niveau = v;
    rouge(r, 'sans niveau L, B, M ou I');
  }
});
