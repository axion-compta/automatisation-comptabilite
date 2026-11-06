import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyserDepot, analyserTexte, COUCHE_APPELS, estExclu } from '../appels.mjs';

test('vert : usage de la couche api et dépôt réel', () => {
  assert.deepEqual(analyserTexte("import { envoyerEcriture } from './api.js'; await envoyerEcriture();", 'E.tsx'), []);
  assert.deepEqual(analyserDepot(), []);
});

test('rouge : fetch direct, XMLHttpRequest, WebSocket, axios', () => {
  assert.equal(analyserTexte("const r = await fetch('/x');", 'E.tsx').length, 1);
  assert.equal(analyserTexte('const x = new XMLHttpRequest();', 'E.tsx').length, 1);
  assert.equal(analyserTexte("const w = new WebSocket('ws://x');", 'E.tsx').length, 1);
  assert.ok(analyserTexte("import axios from 'axios'; axios.get('/x')", 'E.tsx').length >= 1);
  assert.equal(analyserTexte('window.fetch(u)', 'E.tsx').length, 1);
});

test('vert : méthode nommée fetch, commentaires', () => {
  assert.deepEqual(analyserTexte('cache.fetch(a); // fetch(b)\n/* fetch(c) */', 'E.tsx'), []);
});

test('exclusions : couche api, tests, hors apps/web/src', () => {
  assert.ok(estExclu(COUCHE_APPELS));
  assert.ok(estExclu('apps/web/src/G.ts', '// @generated\nfetch(u)'));
  assert.ok(estExclu('apps/web/src/__tests__/api.test.ts'));
  assert.ok(estExclu('packages/faux-serveur/src/a.ts'));
  assert.ok(!estExclu('apps/web/src/Ecran.tsx', 'x'));
});

test('dépôt simulé : fetch hors api.ts rouge, dans api.ts vert', () => {
  const git = (args) => (args[0] === 'rev-parse' ? '/r\n' : 'apps/web/src/Ecran.tsx\0apps/web/src/api.ts\0');
  const contenu = { '/r/apps/web/src/Ecran.tsx': 'fetch("/a")', '/r/apps/web/src/api.ts': 'fetch("/a")' };
  const pb = analyserDepot(git, (f) => contenu[f]);
  assert.equal(pb.length, 1);
  assert.match(pb[0], /Ecran\.tsx:1/);
});

test('rouge : une forme par ligne (alias, optionnel, crochets, espaces, modules, import http)', () => {
  const formes = ['fetch?.(u)', 'window["fetch"](u)', 'const f = fetch;', 'new window.XMLHttpRequest()', 'navigator . sendBeacon(u)',
    "import ky from 'ky'", 'new EventSource(u)', 'navigator.sendBeacon(u)', "await import('https://x.org/m.js')"];
  for (const f of formes) assert.ok(analyserTexte(f, 'E.tsx').length >= 1, f);
  assert.deepEqual(analyserTexte("const m = await import('./faux.js'); const o = { fetch: 1 };", 'E.tsx'), []);
});
