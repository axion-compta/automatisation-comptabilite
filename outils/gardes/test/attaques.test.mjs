import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENTETE, analyserCatalogue, titresDeTests } from '../attaques.mjs';

const ids = Array.from({ length: 33 }, (_, i) => `ATK-${String(i + 1).padStart(2, '0')}`);
const FICHIER = 'a/essai.test.ts';
const TEXTE_TEST = "describe('x', () => {\n  it('cas-un-rejoue', () => {});\n  test(\"cas-deux\", () => {});\n});";
const lire = (f) => (f === FICHIER ? TEXTE_TEST : null);

function catalogue(surcharge = {}, retirer = []) {
  const lignes = ids
    .filter((id) => !retirer.includes(id))
    .map((id) => surcharge[id] ?? `${id},,majeure,a_decrire,,`);
  return [ENTETE, ...lignes].join('\n') + '\n';
}

test('catalogue-complet-vert', () => {
  const csv = catalogue({ 'ATK-31': `ATK-31,Fichier actif,critique,decrite,cas-un,${FICHIER}`, 'ATK-32': `ATK-32,Chaine,critique,decrite,cas-deux,${FICHIER}` });
  const r = analyserCatalogue(csv, lire);
  assert.deepEqual(r.problemes, []);
  assert.equal(r.decrites, 2);
  assert.equal(r.aDecrire, 31);
  assert.equal(r.critiquesSansTest, 0);
});

test('identifiant-manquant-rouge', () => {
  assert.ok(analyserCatalogue(catalogue({}, ['ATK-07']), lire).problemes.some((p) => p.includes('ATK-07')));
  assert.ok(analyserCatalogue(catalogue({ 'ATK-05': 'ATK-34,,majeure,a_decrire,,' }), lire).problemes.some((p) => p.includes('ATK-34')));
  assert.ok(analyserCatalogue(catalogue({ 'ATK-05': 'ATK-00,,majeure,a_decrire,,' }), lire).problemes.some((p) => p.includes('ATK-00')));
  assert.ok(analyserCatalogue(catalogue().replace(ENTETE, 'id,titre'), lire).problemes.some((p) => p.includes('en-tête')));
});

test('doublon-rouge', () => {
  const csv = catalogue({ 'ATK-09': 'ATK-08,,majeure,a_decrire,,' });
  assert.ok(analyserCatalogue(csv, lire).problemes.some((p) => p.includes('ATK-08') && p.includes('double')));
});

test('critique-decrite-sans-test-rouge', () => {
  const sans = (extra) => analyserCatalogue(catalogue({ 'ATK-31': `ATK-31,Fichier actif,critique,decrite,${extra}` }), lire);
  for (const extra of [`absent,${FICHIER}`, `cas-un,autre.test.ts`, `,${FICHIER}`, ',']) {
    const r = sans(extra);
    assert.equal(r.critiquesSansTest, 1, extra);
    assert.ok(r.problemes.some((p) => p.includes('ATK-31')), extra);
  }
  // une décrite seulement « majeure » sans test ne rougit pas la garde critique
  const maj = analyserCatalogue(catalogue({ 'ATK-31': `ATK-31,Fichier actif,majeure,decrite,absent,${FICHIER}` }), lire);
  assert.equal(maj.critiquesSansTest, 0);
  // statut ou gravité inconnus
  assert.ok(analyserCatalogue(catalogue({ 'ATK-31': 'ATK-31,x,grave,decrite,,' }), lire).problemes.length > 0);
  assert.ok(analyserCatalogue(catalogue({ 'ATK-31': 'ATK-31,x,critique,brouillon,,' }), lire).problemes.length > 0);
});

test('a-decrire-compte-sans-rougir', () => {
  const r = analyserCatalogue(catalogue(), lire);
  assert.deepEqual(r.problemes, []);
  assert.equal(r.aDecrire, 33);
  assert.equal(r.decrites, 0);
  // un critique à décrire n'est pas « sans test »
  const c = analyserCatalogue(catalogue({ 'ATK-02': 'ATK-02,,critique,a_decrire,,' }), lire);
  assert.deepEqual(c.problemes, []);
  assert.equal(c.critiquesSansTest, 0);
});

test('decompte-affiche', () => {
  const r = analyserCatalogue(catalogue({ 'ATK-31': `ATK-31,Fichier actif,critique,decrite,absent,${FICHIER}` }), lire);
  assert.match(r.resume, /1 decrites \/ 32 a_decrire \/ 1 critiques sans test/);
  assert.deepEqual(titresDeTests(TEXTE_TEST), ['cas-un-rejoue', 'cas-deux']);
});
