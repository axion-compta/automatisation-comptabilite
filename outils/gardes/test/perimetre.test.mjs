import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyserPerimetre, estAutorise, lireFiche } from '../perimetre.mjs';

const fiche = {
  fichiers_autorises: ['outils/gardes/perimetre*', 'outils/gardes/test/{perimetre,fictif}*', 'pilotage/journal/L00-T03.md'],
  taille_max_lignes: 100,
  nouvelles_dependances: [],
};

test('lireFiche lit l’en-tête', () => {
  const f = lireFiche('---\nid: L00-T03\nordre: 3\nfichiers_autorises: ["a/*"]\n---\ncorps');
  assert.equal(f.id, 'L00-T03');
  assert.equal(f.ordre, 3);
  assert.deepEqual(f.fichiers_autorises, ['a/*']);
});

test('vert : fichiers autorisés', () => {
  const diff = { fichiers: ['outils/gardes/perimetre.mjs', 'outils/gardes/test/fictif.test.mjs'], lignes: 50 };
  assert.deepEqual(analyserPerimetre(fiche, diff), []);
});

test('rouge : fichier hors liste', () => {
  const pb = analyserPerimetre(fiche, { fichiers: ['LICENSE'], lignes: 1 });
  assert.equal(pb.length, 1);
  assert.match(pb[0], /hors liste : LICENSE/);
});

test('rouge : motif ne déborde pas sur un sous-dossier', () => {
  assert.equal(estAutorise('outils/gardes/test/perimetre.test.mjs', ['outils/gardes/perimetre*']), false);
});

test('rouge : trop de lignes', () => {
  const pb = analyserPerimetre(fiche, { fichiers: ['outils/gardes/perimetre.mjs'], lignes: 101 });
  assert.match(pb[0], /taille 101/);
});

test('rouge : dépendance ajoutée, vert si autorisée', () => {
  const diff = { fichiers: [], lignes: 1 };
  const paquets = [{ chemin: 'package.json', base: '{"devDependencies":{}}', branche: '{"devDependencies":{"x-lib":"1.0.0"}}' }];
  assert.match(analyserPerimetre(fiche, diff, paquets)[0], /dépendance modifiée/);
  assert.deepEqual(analyserPerimetre({ ...fiche, nouvelles_dependances: ['x-lib'] }, diff, paquets), []);
});

test('vert : package.json sans changement de dépendances', () => {
  const t = '{"dependencies":{"a":"1"},"scripts":{"x":"y"}}';
  const t2 = '{"dependencies":{"a":"1"},"scripts":{"x":"z"}}';
  assert.deepEqual(analyserPerimetre(fiche, { fichiers: [], lignes: 1 }, [{ chemin: 'package.json', base: t, branche: t2 }]), []);
});
