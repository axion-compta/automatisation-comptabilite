import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyser, titresDeTests } from '../controles.mjs';

const ENTETE = 'id,exigence,gravite,bloque,declencheurs,phase,test_id,parametres,actif';
const ligne = (o = {}) => {
  const v = { id: 'C-001', exigence: 'V3-CTL-001', gravite: 'B', bloque: 'cloture|export_officiel', declencheurs: 'continu|avant_tva', phase: 'P2', test_id: 'equilibre-ecriture', parametres: '', actif: 'oui', ...o };
  return Object.values(v).join(',');
};
const csv = (...lignes) => [ENTETE, ...lignes].join('\n') + '\n';
const TITRES = ['equilibre-ecriture rouge si déséquilibre', 'autre test'];

test('catalogue-absent-rouge', () => {
  const pb = analyser(null, TITRES);
  assert.equal(pb.length, 1);
  assert.match(pb[0], /absent/);
});

test('entete-invalide-rouge', () => {
  const pb = analyser('id,exigence,gravite\nC-001,x,B\n', TITRES);
  assert.equal(pb.length, 1);
  assert.match(pb[0], /en-tête/);
});

test('id-double-rouge', () => {
  const pb = analyser(csv(ligne(), ligne()), TITRES);
  assert.equal(pb.length, 1);
  assert.match(pb[0], /id en double/);
});

test('gravite-inconnue-rouge', () => {
  const pb = analyser(csv(ligne({ gravite: 'X' })), TITRES);
  assert.equal(pb.length, 1);
  assert.match(pb[0], /gravite/);
});

test('test-id-sans-test-rouge', () => {
  const pb = analyser(csv(ligne({ test_id: 'inexistant' })), TITRES);
  assert.equal(pb.length, 1);
  assert.match(pb[0], /test_id/);
});

test('catalogue-valide-vert', () => {
  assert.deepEqual(analyser(csv(ligne(), ligne({ id: 'C-002', gravite: 'I', bloque: 'aucun', declencheurs: 'demande', test_id: 'autre test', actif: 'non' })), TITRES), []);
  assert.deepEqual(analyser(ENTETE + '\n', TITRES), []);
  assert.deepEqual(titresDeTests("it('a b', () => {});\n  test.skip(\"c\", () => {});\nit(`d`, () => {});"), ['a b', 'c', 'd']);
});

test('valeurs hors liste rouges', () => {
  assert.equal(analyser(csv(ligne({ bloque: 'cloture|zzz' })), TITRES).length, 1);
  assert.equal(analyser(csv(ligne({ declencheurs: 'continu|zzz' })), TITRES).length, 1);
  assert.equal(analyser(csv(ligne({ actif: 'peut-etre' })), TITRES).length, 1);
});
