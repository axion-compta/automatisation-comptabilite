import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyserPerimetre, collecter, estAutorise, estPRPilotage, lireRaw, evaluer, idDeBranche, lireFiche } from '../perimetre.mjs';

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
    'diff --numstat --text --no-renames -z origin/main...HEAD': '3\t1\ta.txt\0',
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

const ficheSens = '---\nid: L00-T03\nsensible: oui\nstatut: a_faire\nfichiers_autorises: ["pilotage/fiches/*"]\ntaille_max_lignes: 50\n---\n';
const gitRepli = (fiche = ficheSens, noms = 'pilotage/fiches/L00-T03.md\0') =>
  fauxGit({
    'show origin/main:pilotage/fiches/L00-T03.md': fiche,
    'diff --name-only --no-renames -z origin/main...HEAD': noms,
    'diff --numstat --text --no-renames -z origin/main...HEAD': '1\t1\tpilotage/fiches/L00-T03.md\0',
  });
const eRepli = { GITHUB_HEAD_REF: 'divers/x', CORPS_PR: 'Fiche: L00-T03\n' };

test('collecte : id lu dans CORPS_PR (PR fiches seules, fiche sensible), git diff en échec = rouge', () => {
  assert.deepEqual(evaluer(gitRepli(), eRepli).pb, []);
  const g = fauxGit({ 'diff --numstat --text --no-renames -z origin/main...HEAD': null });
  assert.match(evaluer(g, env).pb[0], /git diff impossible/);
});

const RAW = 'diff --raw --no-renames -z origin/main...HEAD';
const entree = (statut, chemin, mode = '100644') => `:000000 ${mode} 0000000 abcdef0 ${statut}\0${chemin}\0`;
const pil = (entrees, branche = 'lot-00/fiches-T19-T23', extra = {}) =>
  evaluer(fauxGit({ [RAW]: entrees.join(''), ...extra }), { GITHUB_HEAD_REF: branche });

test('vert-pr-de-pilotage-fiches-seules', () => {
  const r = pil([entree('A', 'pilotage/fiches/L00-T19.md'), entree('A', 'pilotage/journal/L00-T19.md')]);
  assert.deepEqual(r.pb, []);
  assert.match(r.msg, /PR de pilotage, 2 fichier/);
  assert.deepEqual(pil([entree('A', 'pilotage/fiches/L00-T19.md')], 'pilotage/x').pb, []);
});

test('rouge-pr-pilotage-modification-suppression-arret-consignes', () => {
  for (const [st, f] of [
    ['M', 'pilotage/fiches/L00-T03.md'],
    ['D', 'pilotage/fiches/L00-T03.md'],
    ['A', 'pilotage/ARRET'],
    ['A', 'pilotage/consignes/x.md'],
    ['M', 'pilotage/LISEZMOI.md'],
  ]) {
    assert.match(pil([entree('A', 'pilotage/fiches/L00-T19.md'), entree(st, f)]).pb[0], /aucune fiche/, st + f);
  }
});

test('rouge-pr-pilotage-nom-hors-motif-ou-accentue', () => {
  assert.ok(pil([entree('A', 'pilotage/fiches/é.md')]).pb.length > 0);
  assert.ok(pil([entree('A', 'pilotage/fiches/L00-T19.md.txt')]).pb.length > 0);
});

test('rouge-pr-pilotage-lien-symbolique-ou-sous-module', () => {
  assert.ok(pil([entree('A', 'pilotage/fiches/L00-T19.md', '120000')]).pb.length > 0);
  assert.ok(pil([entree('A', 'pilotage/fiches/L00-T20.md', '160000')]).pb.length > 0);
});

test('rouge-pr-pilotage-avec-fichier-outils', () => {
  for (const d of ['outils/gardes/x.mjs', 'packages/a/b.ts', 'scripts/v.mjs', 'CLAUDE.md', '.github/workflows/ci.yml']) {
    assert.ok(pil([entree('A', 'pilotage/fiches/L00-T19.md'), entree('A', d)]).pb.length > 0, d);
  }
});

test('rouge-pr-pilotage-avec-github', () => {
  assert.ok(pil([entree('A', 'pilotage/fiches/L00-T19.md'), entree('A', '.github/workflows/ci.yml')]).pb.length > 0);
});

test('rouge-branche-ordinaire-sans-fiche', () => {
  const e = [entree('A', 'pilotage/fiches/L00-T19.md')];
  assert.match(pil(e, 'divers/x').pb[0], /aucune fiche/);
  assert.match(pil(e, 'lot-00/autre-chose').pb[0], /aucune fiche/);
});

test('hors-pr-le-mode-pilotage-ne-s-applique-pas', () => {
  const g = fauxGit({ [RAW]: entree('A', 'pilotage/fiches/L00-T19.md'), 'rev-parse --abbrev-ref HEAD': 'pilotage/x\n' });
  assert.match(evaluer(g).msg, /pas de branche de fiche/);
  assert.equal(collecter(g).pilotage, undefined);
});

test('rouge-pilotage-git-en-echec', () => {
  const g = fauxGit({ [RAW]: null });
  assert.match(evaluer(g, { GITHUB_HEAD_REF: 'pilotage/x' }).pb[0], /aucune fiche/);
});

test('rouge-fichier-binaire-octet-nul', () => {
  const g = fauxGit({ 'show HEAD:a.txt': ['x', 'y'].join('\0') });
  assert.match(evaluer(g, env).pb[0], /fichier binaire : a\.txt/);
});

test('estPRPilotage-et-lireRaw-cas-limites', () => {
  assert.equal(estPRPilotage('pilotage/x', []), false);
  assert.deepEqual(lireRaw(entree('M', 'a b/é.md')), [{ statut: 'M', mode: '100644', chemin: 'a b/é.md' }]);
});

test('T23-1 virgule hors accolades : littérale, pas une alternative', () => {
  assert.equal(estAutorise('n/importe/quoi.b', ['a,b']), false);
  assert.equal(estAutorise('a', ['a,b']), false);
  assert.equal(estAutorise('a,b', ['a,b']), true);
  assert.equal(estAutorise('x/b.js', ['x/{a,b}.js']), true);
  assert.equal(estAutorise('x/c.js', ['x/{a,b}.js']), false);
  assert.equal(estAutorise('c.txt', ['{a,b}.txt|c.txt']), false);
});

test('T23-2 nouvelles_dependances en chaîne = rouge', () => {
  const pb = analyserPerimetre({ ...fiche, nouvelles_dependances: 'x-lib' }, { fichiers: [], lignes: 1 });
  assert.match(pb[0], /nouvelles_dependances n’est pas un tableau/);
  assert.deepEqual(analyserPerimetre({ ...fiche, nouvelles_dependances: [] }, { fichiers: [], lignes: 1 }), []);
});

test('T23-3 overrides, pnpm.overrides et resolutions comparés à main', () => {
  const diff = { fichiers: [], lignes: 1 };
  const base = '{"name":"x"}';
  for (const [t, motif] of [
    ['{"overrides":{"lib":"2.0.0"}}', /overrides:lib/],
    ['{"pnpm":{"overrides":{"lib":"2.0.0"}}}', /pnpm\.overrides:lib/],
    ['{"resolutions":{"lib":"2.0.0"}}', /resolutions:lib/],
  ]) {
    const paquets = [{ chemin: 'package.json', base, branche: t }];
    assert.match(analyserPerimetre(fiche, diff, paquets)[0], motif);
    assert.deepEqual(analyserPerimetre({ ...fiche, nouvelles_dependances: ['lib'] }, diff, paquets), []);
  }
});

const ficheP = '---\nid: L00-T03\nfichiers_autorises: ["package.json"]\ntaille_max_lignes: 50\n---\n';
const gitP = (branche) =>
  fauxGit({
    'show origin/main:pilotage/fiches/L00-T03.md': ficheP,
    'diff --name-only --no-renames -z origin/main...HEAD': 'package.json\0',
    'diff --numstat --text --no-renames -z origin/main...HEAD': '1\t1\tpackage.json\0',
    'show origin/main:package.json': '{}',
    'show HEAD:package.json': branche,
  });

test('T23-4 package.json invalide : message distinct de « fiche illisible »', () => {
  const pb = evaluer(gitP('{ pas du json'), env).pb;
  assert.equal(pb.length, 1);
  assert.match(pb[0], /package\.json invalide : package\.json/);
  assert.doesNotMatch(pb[0], /fiche illisible/);
  assert.deepEqual(evaluer(gitP('{}'), env).pb, []);
  assert.match(evaluer(fauxGit({ 'show origin/main:pilotage/fiches/L00-T03.md': 'sans en-tête' }), env).pb[0], /fiche illisible/);
});

test('T23-4 fichier binaire (numstat « - - ») compté comme rouge explicite, pas 0 ligne', () => {
  const g = fauxGit({ 'diff --numstat --text --no-renames -z origin/main...HEAD': '-\t-\ta.txt\0' });
  assert.match(evaluer(g, env).pb[0], /fichier binaire non comptable : a\.txt/);
});

test('T23-5 repli CORPS_PR refusé dès qu’un autre fichier est touché', () => {
  const g = gitRepli(ficheSens.replace('["pilotage/fiches/*"]', '["**"]'), 'pilotage/fiches/L00-T03.md\0outils/x.mjs\0');
  assert.match(evaluer(g, eRepli).pb[0], /repli CORPS_PR refusé.*outils\/x\.mjs/);
  assert.match(evaluer(gitRepli(ficheSens, ''), eRepli).pb[0], /repli CORPS_PR refusé/);
});

test('T23-5 repli CORPS_PR refusé si la fiche est déjà fait sur main ou non sensible', () => {
  const fait = ficheSens.replace('a_faire', 'fait');
  assert.match(evaluer(gitRepli(fait), eRepli).pb.join(), /déjà statut: fait/);
  const ns = ficheSens.replace('sensible: oui', 'sensible: non');
  assert.match(evaluer(gitRepli(ns), eRepli).pb.join(), /n’est pas sensible/);
});

test('T23-5 TITRE_PR : l’id du titre doit être celui de la branche (ou du corps)', () => {
  assert.deepEqual(evaluer(fauxGit(), { ...env, TITRE_PR: 'L00-T03 un titre' }).pb, []);
  assert.match(evaluer(fauxGit(), { ...env, TITRE_PR: 'L00-T04 un titre' }).pb[0], /titre de PR/);
  assert.match(evaluer(fauxGit(), { ...env, TITRE_PR: 'un titre' }).pb[0], /titre de PR/);
  assert.match(evaluer(fauxGit(), { ...env, TITRE_PR: 'L00-T03' }).pb[0], /titre de PR/);
  assert.deepEqual(evaluer(gitRepli(), { ...eRepli, TITRE_PR: 'L00-T03 titre' }).pb, []);
  assert.match(evaluer(gitRepli(), { ...eRepli, TITRE_PR: 'L00-T09 titre' }).pb[0], /titre de PR/);
});

test('T32-1 accolade ouvrante jamais fermée = motif invalide', () => {
  const diff = { fichiers: [], lignes: 1 };
  const pb = analyserPerimetre({ ...fiche, fichiers_autorises: ['x/{a,b.js'] }, diff);
  assert.match(pb[0], /motif invalide/);
  assert.deepEqual(analyserPerimetre({ ...fiche, fichiers_autorises: ['x/{a,b}.js'] }, diff), []);
});

test('T32-2 l’id de la fiche dans le corps s’arrête à une frontière de mot', () => {
  const g = gitRepli(ficheSens, '');
  const e = { GITHUB_HEAD_REF: 'divers/x', CORPS_PR: 'Fiche: L00-T033\n' };
  assert.equal(collecter(g, e).id, undefined);
});

test('T32-3 champs pnpm et lots embarqués comparés à main', () => {
  const diff = { fichiers: [], lignes: 1 };
  const base = '{"name":"x"}';
  for (const [t, motif, nom] of [
    ['{"pnpm":{"packageExtensions":{"lib":{"dependencies":{"y":"1"}}}}}', /pnpm\.packageExtensions:lib/, 'lib'],
    ['{"pnpm":{"patchedDependencies":{"lib@1.0.0":"patches/lib.patch"}}}', /pnpm\.patchedDependencies:lib@1\.0\.0/, 'lib@1.0.0'],
    ['{"bundleDependencies":["lib"]}', /bundleDependencies:lib/, 'lib'],
    ['{"bundledDependencies":["lib"]}', /bundledDependencies:lib/, 'lib'],
  ]) {
    const paquets = [{ chemin: 'package.json', base, branche: t }];
    assert.match(analyserPerimetre(fiche, diff, paquets)[0], motif);
    assert.deepEqual(analyserPerimetre({ ...fiche, nouvelles_dependances: [nom] }, diff, paquets), []);
  }
});

test('T32-4 pnpm-workspace.yaml : overrides, packageExtensions et catalog comparés à main', () => {
  const diff = { fichiers: [], lignes: 1 };
  const base = 'packages:\n  - "a/*"\noverrides:\n  vieux: 1.0.0\n';
  for (const [t, motif] of [
    [base + '  lib: 2.0.0\n', /pnpm-workspace\.overrides:lib/],
    [base + 'packageExtensions:\n  lib:\n    dependencies:\n      y: "1"\n', /pnpm-workspace\.packageExtensions:lib/],
    [base + 'catalog:\n  "@s/lib": 3.0.0\n', /pnpm-workspace\.catalog:@s\/lib/],
  ]) {
    const paquets = [{ chemin: 'pnpm-workspace.yaml', base, branche: t }];
    assert.match(analyserPerimetre(fiche, diff, paquets)[0], motif);
  }
  const identique = [{ chemin: 'pnpm-workspace.yaml', base, branche: base + 'packages2:\n  - x\n' }];
  assert.deepEqual(analyserPerimetre(fiche, diff, identique), []);
  const permis = [{ chemin: 'pnpm-workspace.yaml', base, branche: base + '  lib: 2.0.0\n' }];
  assert.deepEqual(analyserPerimetre({ ...fiche, nouvelles_dependances: ['lib'] }, diff, permis), []);
});
