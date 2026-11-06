import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyserPerimetre, estAutorise, evaluer, idDeBranche, lireFiche } from '../perimetre.mjs';

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

test('rouge : taille_max_lignes absent ou non numérique, fichiers_autorises pas un tableau', () => {
  const diff = { fichiers: [], lignes: 1 };
  assert.match(analyserPerimetre({ fichiers_autorises: ['a'] }, diff)[0], /taille_max_lignes/);
  assert.match(analyserPerimetre({ fichiers_autorises: ['a'], taille_max_lignes: 'x' }, diff)[0], /taille_max_lignes/);
  assert.match(analyserPerimetre({ fichiers_autorises: 'a', taille_max_lignes: 9 }, diff)[0], /tableau/);
});

const ficheMain = '---\nid: L00-T03\nfichiers_autorises: ["a.txt"]\ntaille_max_lignes: 50\n---\n';
const fauxGit = (extra = {}) => {
  const t = {
    'show origin/main:pilotage/fiches/L00-T03.md': ficheMain,
    'diff --name-only --no-renames -z origin/main...HEAD': 'a.txt\0',
    'diff --numstat --no-renames -z origin/main...HEAD': '3\t1\ta.txt\0',
    ...extra,
  };
  return (args) => t[args.join(' ')] ?? null;
};
const env = { GITHUB_HEAD_REF: 'lot-00/L00-T03' };

test('collecte : vert, lignes comptées', () => {
  const r = evaluer(fauxGit(), env);
  assert.deepEqual(r.pb, []);
  assert.equal(idDeBranche('lot-00/L01-T02'), undefined);
  assert.match(r.msg, /L00-T03, 1 fichier\(s\), 4 ligne/);
});

test('collecte : fiche modifiée sur la branche mais lue sur main = rouge', () => {
  const g = fauxGit({
    'diff --name-only --no-renames -z origin/main...HEAD': 'a.txt\0pilotage/fiches/L00-T03.md\0',
    'show HEAD:pilotage/fiches/L00-T03.md': ficheMain.replace('["a.txt"]', '["**"]'),
  });
  const pb = evaluer(g, env).pb;
  assert.equal(pb.length, 1);
  assert.match(pb[0], /hors liste : pilotage\/fiches\/L00-T03\.md/);
});

test('collecte : renommage hors liste vu par ses deux chemins (--no-renames)', () => {
  const pb = evaluer(fauxGit({ 'diff --name-only --no-renames -z origin/main...HEAD': 'LICENSE\0a.txt\0' }), env).pb;
  assert.match(pb[0], /hors liste : LICENSE/);
});

test('collecte : chemin accentué non protégé par des guillemets', () => {
  const pb = evaluer(fauxGit({ 'diff --name-only --no-renames -z origin/main...HEAD': 'dossier/é à.txt\0' }), env).pb;
  assert.match(pb[0], /hors liste : dossier\/é à\.txt/);
});

test('collecte : branche lot-01/L01-T05 lit la fiche L01-T05', () => {
  const g = fauxGit({ 'show origin/main:pilotage/fiches/L01-T05.md': ficheMain.replace('a.txt', 'b.txt') });
  const pb = evaluer(g, { GITHUB_HEAD_REF: 'lot-01/L01-T05' }).pb;
  assert.match(pb[0], /hors liste : a\.txt/);
});

test('collecte : fiche introuvable, branche sans fiche en PR = rouge ; hors PR = vert', () => {
  assert.match(evaluer(fauxGit(), { GITHUB_HEAD_REF: 'lot-00/L00-T99' }).pb[0], /introuvable/);
  assert.match(evaluer(fauxGit(), { GITHUB_HEAD_REF: 'divers/x' }).pb[0], /aucune fiche/);
  assert.deepEqual(evaluer(fauxGit({ 'rev-parse --abbrev-ref HEAD': 'main\n' })).pb, []);
});

test('collecte : id lu dans CORPS_PR, git diff en échec = rouge', () => {
  const e = { GITHUB_HEAD_REF: 'divers/x', CORPS_PR: 'Fiche: L00-T03\n' };
  assert.deepEqual(evaluer(fauxGit(), e).pb, []);
  const g = fauxGit({ 'diff --numstat --no-renames -z origin/main...HEAD': null });
  assert.match(evaluer(g, env).pb[0], /git diff impossible/);
});
