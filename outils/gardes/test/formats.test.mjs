import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ENTETE, analyserCatalogue, lireCatalogue } from '../formats.mjs';

const ligne = (o = {}) => {
  const v = {
    code: 'fec_export',
    sens: 'export',
    phase: 'P7',
    exigence: 'V3-DEC-030',
    test_id: '',
    niveau_test: '',
    ecran: 'ecran-fec',
    outil_chat: 'outil-fec',
    controle: 'prevu',
    ...o,
  };
  return Object.values(v).join(',');
};
const csv = (...lignes) => [ENTETE, ...lignes].join('\n') + '\n';
const vide = new Set();

test('entete-different-rouge', () => {
  assert.throws(() => lireCatalogue('code,sens\nfec,export\n'), /en-tête/);
  assert.throws(() => lireCatalogue(''), /en-tête/);
  assert.throws(() => lireCatalogue('﻿' + csv(ligne())), /BOM/);
  assert.throws(() => lireCatalogue(ENTETE + ',x\n'), /en-tête/);
  assert.throws(() => lireCatalogue(csv('a,b')), /colonnes/);
  assert.throws(() => lireCatalogue(csv(ligne({ sens: 'autre' }))), /sens/);
  assert.throws(() => lireCatalogue(csv(ligne({ controle: 'oui' }))), /controle/);
  assert.throws(() => lireCatalogue(csv(ligne({ niveau_test: 'x' }))), /niveau_test/);
  assert.throws(() => lireCatalogue(csv(ligne({ code: '"a"' }))), /guillemet/);
  assert.throws(() => lireCatalogue(csv(ligne({ code: ' fec' }))), /espace/);
  assert.throws(() => lireCatalogue(csv(ligne({ code: '' }))), /code vide/);
});

test('code-en-double-rouge', () => {
  assert.throws(() => lireCatalogue(csv(ligne(), ligne())), /double/);
});

test('actif-sans-test-rouge', () => {
  const l = lireCatalogue(csv(ligne({ controle: 'actif', niveau_test: 'aller_retour' })));
  const r = analyserCatalogue(l, vide, vide);
  assert.equal(r.erreurs.length, 1);
  assert.match(r.erreurs[0], /sans test_id/);
  const l2 = lireCatalogue(csv(ligne({ controle: 'actif', test_id: 't1' })));
  const r2 = analyserCatalogue(l2, new Set(['t1']), vide);
  assert.equal(r2.erreurs.length, 1);
  assert.match(r2.erreurs[0], /niveau_test/);
});

test('actif-test-inconnu-rouge', () => {
  const l = lireCatalogue(csv(ligne({ controle: 'actif', test_id: 't1', niveau_test: 'validateur_officiel' })));
  const r = analyserCatalogue(l, new Set(['autre']), vide);
  assert.equal(r.erreurs.length, 1);
  assert.match(r.erreurs[0], /inconnu/);
  assert.deepEqual(analyserCatalogue(l, new Set(['t1']), vide).erreurs, []);
});

test('prevu-dont-le-test-existe-rouge', () => {
  const l = lireCatalogue(csv(ligne({ test_id: 't1' })));
  const r = analyserCatalogue(l, new Set(['t1']), vide);
  assert.equal(r.erreurs.length, 1);
  assert.match(r.erreurs[0], /passer à actif/);
  assert.deepEqual(analyserCatalogue(l, vide, vide).erreurs, []);
});

test('ecran-vide-avertissement-seul', () => {
  const l = lireCatalogue(csv(ligne({ ecran: '' }), ligne({ code: 'b', outil_chat: '' })));
  const r = analyserCatalogue(l, vide, vide);
  assert.deepEqual(r.erreurs, []);
  assert.equal(r.avertissements.length, 2);
  assert.match(r.avertissements[0], /ecran/);
  assert.match(r.avertissements[1], /outil_chat/);
});

test('format-du-code-sans-ligne-rouge', () => {
  const l = lireCatalogue(csv(ligne()));
  const r = analyserCatalogue(l, vide, new Set(['fec_export', 'nouveau']));
  assert.equal(r.erreurs.length, 1);
  assert.match(r.erreurs[0], /nouveau/);
});

test('catalogue-du-depot-vert', () => {
  const l = lireCatalogue(readFileSync('docs/formats.csv', 'utf8'));
  assert.ok(l.length >= 19);
  assert.ok(l.every((x) => x.controle === 'prevu'));
});

test('lignes-vides-crlf-acceptes', () => {
  assert.equal(lireCatalogue(csv(ligne()).replace(/\n/g, '\r\n')).length, 1);
  assert.deepEqual(lireCatalogue(ENTETE + '\n'), []);
  assert.throws(() => lireCatalogue(ENTETE + '\n\n' + ligne() + '\n'), /colonnes/);
});
