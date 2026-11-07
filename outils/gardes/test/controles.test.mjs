import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyser, fichiersDeTests, titresDeTests } from '../controles.mjs';

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
  assert.deepEqual(titresDeTests("it('a b', () => {});\n  test(\"c\", () => {});\nit(`d`, () => {});"), ['a b', 'c', 'd']);
});

test('valeurs hors liste rouges', () => {
  assert.equal(analyser(csv(ligne({ bloque: 'cloture|zzz' })), TITRES).length, 1);
  assert.equal(analyser(csv(ligne({ declencheurs: 'continu|zzz' })), TITRES).length, 1);
  assert.equal(analyser(csv(ligne({ actif: 'peut-etre' })), TITRES).length, 1);
});

test('test_id vide rouge', () => {
  assert.match(analyser(csv(ligne({ test_id: '' })), TITRES)[0], /test_id/);
  assert.match(analyser(csv(ligne({ test_id: '' })), ['( )', ''])[0], /test_id/);
});

test('colonnes en trop ou en moins rouges', () => {
  const court = analyser(csv('C-001,x,B'), TITRES);
  assert.equal(court.length, 1);
  assert.match(court[0], /colonnes/);
  const long = analyser(csv(ligne() + ',a'), TITRES);
  assert.equal(long.length, 1);
  assert.match(long[0], /colonnes/);
});

test('id vide rouge', () => {
  const pb = analyser(csv(ligne({ id: '' })), TITRES);
  assert.equal(pb.length, 1);
  assert.match(pb[0], /id vide/);
});

test('test_id : mot entier du titre', () => {
  assert.match(analyser(csv(ligne({ test_id: 'e' })), TITRES)[0], /sans test/);
  assert.match(analyser(csv(ligne({ test_id: 'equilibre' })), TITRES)[0], /sans test/);
  assert.deepEqual(analyser(csv(ligne({ test_id: 'a.b' })), ['x a.b y']), []);
  assert.match(analyser(csv(ligne({ test_id: 'a.b' })), ['x aXb y'])[0], /sans test/);
});

test('aucun combiné à une autre valeur rouge', () => {
  const pb = analyser(csv(ligne({ bloque: 'aucun|cloture' })), TITRES);
  assert.equal(pb.length, 1);
  assert.match(pb[0], /aucun/);
});

test('BOM en tête toléré', () => {
  assert.deepEqual(analyser('\uFEFF' + csv(ligne()), TITRES), []);
});

test('titresDeTests ignore commentaires, skip et todo', () => {
  const src = [
    "// it('ligne')",
    "/* test('bloc') */",
    "it.todo('todo');",
    "it.skip('skip');",
    "test.skip('skip2');",
    "it.skipIf(x)('si');",
    "it.runIf(x)('si2');",
    "const u = 'http://x'; it('vrai', () => {});",
  ].join('\n');
  assert.deepEqual(titresDeTests(src), ['vrai']);
});

test('fichiersDeTests filtre les chemins', () => {
  const ok = ['packages/noyau/src/controles/__tests__/a.test.ts', 'packages/noyau/src/controles/x/y/__tests__/b.test.ts'];
  const ko = ['packages/noyau/src/controles/a.test.ts', 'packages/noyau/src/controles/__tests__/a.ts', 'packages/autre/src/controles/__tests__/a.test.ts', 'packages/noyau/src/controles/__tests__/a/b.test.ts', ''];
  assert.deepEqual(fichiersDeTests([...ok, ...ko]), ok);
});
