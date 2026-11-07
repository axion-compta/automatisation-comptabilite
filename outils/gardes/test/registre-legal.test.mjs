import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHAINE_A, CHAINE_B, estConcerne, normaliser, occurrencesInterdites } from '../registre-legal.mjs';

const MOT = 'registre légal';

test('formule-a-permise', () => {
  assert.equal(CHAINE_A, 'document de travail, ne remplace pas le registre légal');
  assert.deepEqual(occurrencesInterdites(CHAINE_A, 'a.md'), []);
  assert.deepEqual(occurrencesInterdites(`Mention : ${CHAINE_A.toUpperCase()}.`, 'a.md'), []);
});

test('formule-b-permise', () => {
  assert.equal(CHAINE_B, 'à recopier dans votre registre légal');
  assert.deepEqual(occurrencesInterdites(CHAINE_B, 'b.md'), []);
  assert.deepEqual(occurrencesInterdites(`x\n${CHAINE_B}\ny`, 'b.md'), []);
});

test('mot-seul-rouge', () => {
  assert.deepEqual(occurrencesInterdites(`a\nb\nvoir le ${MOT} ici`, 'x.md'), ['x.md:3']);
  assert.deepEqual(occurrencesInterdites('', 'x.md'), []);
  assert.deepEqual(occurrencesInterdites('﻿', 'x.md'), []);
  assert.deepEqual(occurrencesInterdites('﻿registre', 'x.md'), []);
});

test('majuscules-et-accents-rouges', () => {
  assert.deepEqual(occurrencesInterdites('REGISTRE LEGAL', 'x.md'), ['x.md:1']);
  assert.deepEqual(occurrencesInterdites('Registre Légal', 'x.md'), ['x.md:1']);
  assert.deepEqual(occurrencesInterdites('registre légal', 'x.md'), ['x.md:1']);
  assert.equal(normaliser('É  À\n\tb'), 'e a b');
});

test('coupure-de-ligne-rouge', () => {
  assert.deepEqual(occurrencesInterdites('le registre\nlégal', 'x.md'), ['x.md:1']);
  assert.deepEqual(occurrencesInterdites('x\r\nregistre\r\n  légal', 'x.md'), ['x.md:2']);
  assert.deepEqual(occurrencesInterdites('registre légal', 'x.md'), ['x.md:1']);
});

test('formule-a-modifiee-rouge', () => {
  assert.deepEqual(occurrencesInterdites('document de travail, ne remplace pas un registre légal', 'x.md'), ['x.md:1']);
  assert.deepEqual(occurrencesInterdites('récopier dans votre registre légal', 'x.md'), ['x.md:1']);
});

test('deux-occurrences-deux-erreurs', () => {
  assert.deepEqual(occurrencesInterdites(`${MOT}\n${MOT}`, 'x.md'), ['x.md:1', 'x.md:2']);
  assert.deepEqual(occurrencesInterdites(`${MOT} ${MOT}`, 'x.md'), ['x.md:1', 'x.md:1']);
  assert.deepEqual(occurrencesInterdites(`${CHAINE_A} ${MOT}`, 'x.md'), ['x.md:1']);
  assert.deepEqual(occurrencesInterdites(`${MOT} ${CHAINE_B} ${CHAINE_A}`, 'x.md'), ['x.md:1']);
});

test('fichier-de-test-ignore', () => {
  assert.equal(estConcerne('packages/textes/src/a.ts'), true);
  assert.equal(estConcerne('apps/web/src/a.tsx'), true);
  assert.equal(estConcerne('apps/web/e2e/a.ts'), true);
  assert.equal(estConcerne('docs/a.csv'), true);
  assert.equal(estConcerne('packages/textes/src/a.test.ts'), false);
  assert.equal(estConcerne('packages/textes/src/a.spec.tsx'), false);
  assert.equal(estConcerne('packages/noyau/src/__tests__/a.ts'), false);
  assert.equal(estConcerne('outils/gardes/a.mjs'), false);
  assert.equal(estConcerne('docs/a.png'), false);
});
