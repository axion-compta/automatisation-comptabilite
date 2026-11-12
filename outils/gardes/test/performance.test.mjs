import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { ENTETE, analyser, lireTableau, main } from '../performance.mjs';
import { SEUIL_P95_MS, lireSeuil, mesurer } from '../../banc/volume.mjs';

const csv = (...l) => [ENTETE, ...l].join('\n') + '\n';
const ok = csv('banc-volume,p95,800,ms', 'tableau-de-bord,p95,500,ms');
const racine = (fichiers) => {
  const r = mkdtempSync(join(tmpdir(), 'perf-'));
  for (const [chemin, texte] of Object.entries(fichiers)) {
    mkdirSync(dirname(join(r, chemin)), { recursive: true });
    writeFileSync(join(r, chemin), texte);
  }
  return r;
};
const CSV = 'docs/budgets-performance.csv';
const banc = (texte) => [{ chemin: 'outils/banc/x.mjs', texte }];

test('tableau-valide-vert', () => {
  assert.deepEqual(analyser(lireTableau(ok), banc('const a = 1;\n')), []);
  assert.equal(lireTableau(ok).length, 2);
  // même écran, métriques différentes : permis
  assert.equal(lireTableau(csv('e,p95,1,ms', 'e,p50,1,ms')).length, 2);
  // fichier réel du dépôt
  assert.deepEqual(analyser(lireTableau(readFileSync('docs/budgets-performance.csv', 'utf8')), []), []);
});

test('doublon-de-seuil-rouge', () => {
  assert.throws(() => lireTableau(csv('e,p95,800,ms', 'e,p95,900,ms')), /double/);
  assert.throws(() => lireTableau(csv('e,p95,800,ms', 'e,p95,800,ms')), /double/);
});

test('ligne-mal-formee-rouge', () => {
  for (const [l, motif] of [
    ['e,p95,800', /colonnes/], ['e,p95,800,ms,x', /colonnes/], [',p95,800,ms', /ecran/], ['e,,800,ms', /metrique/],
    ['e,p95,abc,ms', /seuil/], ['e,p95,0,ms', /seuil/], ['e,p95,-5,ms', /seuil/], ['e,p95,NaN,ms', /seuil/], ['e,p95,1e3,ms', /seuil/],
    ['e,p95,800,euros', /unite/], [`e,p95,${'9'.repeat(400)},ms`, /seuil/], ['e,p95,800,', /unite/], ['E x,p95,800,ms', /ecran/], ['e,p95,800, ms', /unite/],
  ]) assert.throws(() => lireTableau(csv(l)), motif, l);
  assert.throws(() => lireTableau('a,b\n'), /en-tête/);
  assert.throws(() => lireTableau(''), /en-tête/);
  assert.throws(() => lireTableau(ENTETE + '\n"e",p95,1,ms\n'), /guillemet/);
});

test('seuil-en-dur-dans-le-banc-rouge', () => {
  for (const code of ['export const SEUIL_P95_MS = 800;', 'const seuil = 500;', 'f({ seuil: 300 })', 'function g(seuil = 800) {}', 'const seuil_p95 = 1.5;', 'const seuil = -5;']) {
    const e = analyser(lireTableau(ok), banc(code));
    assert.equal(e.length, 1, code);
    assert.match(e[0], /outils\/banc\/x\.mjs/);
  }
  for (const code of ['const seuil = lireSeuil(t);', 'const a = 800;', 'seuil_propose_ms: seuil,']) {
    assert.deepEqual(analyser(lireTableau(ok), banc(code)), [], code);
  }
});

test('seuil-en-dur-dans-le-banc-rouge (parcours du dépôt)', () => {
  assert.deepEqual(main(racine({ [CSV]: ok, 'outils/banc/x.mjs': 'const a = 1;\n' })), []);
  const e = main(racine({ [CSV]: ok, 'outils/banc/x.mjs': 'const seuil = 800;\n' }));
  assert.equal(e.length, 1);
  assert.match(e[0], /outils\/banc\/x\.mjs:1/);
  // sous-dossier, y compris les tests
  assert.match(main(racine({ [CSV]: ok, 'outils/banc/test/y.test.mjs': 'const seuil = 5;\n' })).join(), /outils\/banc\/test\/y\.test\.mjs/);
  // autre extension : ignorée
  assert.deepEqual(main(racine({ [CSV]: ok, 'outils/banc/x.md': 'seuil = 800\n' })), []);
});

test('banc-lit-le-tableau', () => {
  // le couple banc-volume/p95 est obligatoire
  assert.match(analyser(lireTableau(csv('e,p95,1,ms')), []).join(), /banc-volume/);
  assert.match(analyser([], []).join(), /banc-volume/);
  // p95 obligatoire : une autre métrique du même écran ne suffit pas
  assert.match(analyser(lireTableau(csv('banc-volume,p50,1,ms')), []).join(), /banc-volume\/p95 absent/);
  const reel = lireTableau(readFileSync('docs/budgets-performance.csv', 'utf8')).find((l) => l.ecran === 'banc-volume' && l.metrique === 'p95');
  assert.equal(SEUIL_P95_MS, reel.seuil);
  assert.equal(lireSeuil(csv('banc-volume,p95,123,ms')), 123);
  assert.throws(() => lireSeuil(csv('autre,p95,123,ms')), /banc-volume/);
  // la métrique est filtrée : p50 ne remplace pas p95
  assert.equal(lireSeuil(csv('banc-volume,p50,1,ms', 'banc-volume,p95,123,ms')), 123);
  assert.throws(() => lireSeuil(csv('banc-volume,p50,1,ms')), /banc-volume/);
  return mesurer({ bases: [], connecter: async () => true, executer: async () => {}, seuil: lireSeuil(csv('banc-volume,p95,123,ms')) })
    .then((r) => assert.equal(r.seuil_propose_ms, 123));
});

test('tableau-absent-rouge', () => {
  assert.match(main(racine({ 'outils/banc/x.mjs': 'const a = 1;\n' })).join(), /absent/);
  assert.match(main(racine({ [CSV]: 'a,b\n' })).join(), /en-tête/);
  assert.throws(() => lireTableau(undefined), /absent/);
  assert.throws(() => lireTableau(null), /absent/);
});
