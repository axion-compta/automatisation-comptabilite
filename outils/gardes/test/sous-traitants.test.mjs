import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ENTETE, analyserListe } from '../sous-traitants.mjs';

const ligne = (o = {}) => Object.values({ ref: 'HEB-1', role: 'hébergeur principal', ue: 'oui', mere: 'oui', cons: 'non', contrat: '2026-01-10', annonce: '2026-02-01', active: '2026-03-01', actif: 'oui', ...o }).join(',');
const liste = (...l) => [ENTETE, ...l].join('\n') + '\n';
const codes = (...l) => analyserListe(liste(...l)).map((p) => p.code);

test('liste-initiale-verte', () => {
  assert.deepEqual(analyserListe(readFileSync(new URL('../../../docs/sous-traitants.csv', import.meta.url), 'utf8')), []);
  assert.deepEqual(analyserListe(null), []);
  assert.deepEqual(codes(ligne()), []);
  assert.deepEqual(analyserListe(liste(ligne()).replace(/\n/g, '\r\n')), []);
  assert.deepEqual(codes(ligne({ role: '"hébergeur, principal"' })), ['role_invalide']);
  assert.deepEqual(analyserListe('ref,role\nHEB-1,x\n').map((p) => p.code), ['entete_invalide']);
  assert.deepEqual(analyserListe('').map((p) => p.code), ['entete_invalide']);
});

test('actif-sans-contrat-rouge', () => {
  assert.deepEqual(codes(ligne({ contrat: '', annonce: '', active: '' })), ['actif_sans_contrat', 'actif_sans_activation']);
  assert.deepEqual(codes(ligne({ contrat: '' })), ['actif_sans_contrat']);
  assert.deepEqual(codes(ligne({ contrat: '', actif: 'non' })), []);
  assert.deepEqual(codes(ligne({ actif: 'OUI' })), ['valeur_invalide']);
  assert.deepEqual(codes(ligne() + ',x'), ['valeur_invalide']);
  assert.deepEqual(codes('HEB-1,role,oui'), ['valeur_invalide']);
});

test('hors-ue-rouge', () => {
  assert.deepEqual(codes(ligne({ ue: 'non' })), ['hors_ue']);
  assert.deepEqual(codes(ligne({ ue: 'non', actif: 'non' })), []);
  assert.deepEqual(codes(ligne({ ue: '' })), ['valeur_invalide']);
});

test('ia-avec-conservation-rouge', () => {
  assert.deepEqual(codes(ligne({ ref: 'IA-1', cons: 'oui' })), ['ia_avec_conservation']);
  assert.deepEqual(codes(ligne({ ref: 'IA-1', cons: '' })), ['valeur_invalide']);
  assert.deepEqual(codes(ligne({ ref: 'IA-1', cons: 'non' })), []);
  assert.deepEqual(codes(ligne({ ref: 'IA-1', cons: 'oui', actif: 'non' })), []);
  assert.deepEqual(codes(ligne({ ref: 'HEB-2', cons: 'oui' })), []);
});

test('activation-avant-contrat-rouge', () => {
  assert.deepEqual(codes(ligne({ active: '2026-01-09', annonce: '2026-01-01' })), ['activation_avant_contrat']);
  assert.deepEqual(codes(ligne({ active: '2026-01-10', annonce: '2026-01-10' })), []);
  assert.deepEqual(codes(ligne({ active: '2026-02-15', annonce: '2026-02-20' })), ['activation_avant_annonce']);
});

test('ref-en-double-rouge', () => {
  assert.deepEqual(codes(ligne(), ligne()), ['ref_en_double']);
  for (const ref of ['hEB-1', 'HEB-', 'HEB-123', 'H-1', '']) assert.deepEqual(codes(ligne({ ref })), ['ref_invalide']);
});

test('date-irreelle-rouge', () => {
  for (const d of ['2026-02-30', '2026-13-01', '2026-1-1', 'x']) {
    for (const col of ['contrat', 'annonce', 'active']) assert.deepEqual(codes(ligne({ [col]: d })), ['valeur_invalide']);
  }
});

test('nom-propre-dans-role-rouge', () => {
  for (const role of ['Hébergeur', 'hébergeur-1', 'role_x', '', 'a.b']) assert.deepEqual(codes(ligne({ role })), ['role_invalide']);
  assert.deepEqual(codes(ligne({ role: "envoi d'e-mails" })), ['role_invalide']);
  assert.deepEqual(codes(ligne({ role: "fournisseur d'ia 2" })), []);
});
