import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { analyserTexte, masquer } from '../tests.mjs';

const pb = (t) => analyserTexte(t, 't.test.mjs');

test('rouge : test sans assertion', () => {
  const r = pb("test('a', () => {\n  const x = 1;\n});\n");
  assert.equal(r.length, 1);
  assert.match(r[0], /t\.test\.mjs:1 test sans assertion/);
});

test('rouge : test vide, et « expect » seulement dans un commentaire ou un texte', () => {
  assert.equal(pb("it('a', () => {});").length, 1);
  assert.equal(pb("it('expect(1)', () => {\n // expect(1).toBe(1)\n});").length, 1);
});

test('vert : expect, assert, assert.equal, t.assert', () => {
  assert.deepEqual(pb("it('a', () => { expect(1).toBe(1); });"), []);
  assert.deepEqual(pb("test('a', () => { assert.equal(1, 1); });"), []);
  assert.deepEqual(pb("test('a', async (t) => { t.assert.ok(true); });"), []);
  assert.deepEqual(pb("test('a', async () => { await expect(p).rejects.toThrow(); });"), []);
});

test('rouge : skip sans carte (skip, xit, describe.skip, option skip, todo)', () => {
  assert.equal(pb("it.skip('a', () => { expect(1).toBe(1); });").length, 1);
  assert.equal(pb("xit('a', () => { expect(1).toBe(1); });").length, 1);
  assert.equal(pb("describe.skip('a', () => {});").length, 1);
  assert.equal(pb("test('a', { skip: true }, () => { assert.ok(1); });").length, 1);
  assert.equal(pb("it.todo('a');").length, 1);
});

test('vert : skip avec une carte, sur la ligne ou la ligne précédente', () => {
  assert.deepEqual(pb("it.skip('a [L01-T02]', () => { expect(1).toBe(1); });"), []);
  assert.deepEqual(pb("// carte L01-T02\nxit('a', () => { expect(1).toBe(1); });"), []);
});

test('rouge : .only ; vert : it.each avec assertion', () => {
  assert.equal(pb("it.only('a', () => { expect(1).toBe(1); });").length, 1);
  assert.deepEqual(pb("it.each([1, 2])('a %s', (n) => { expect(n).toBeTruthy(); });"), []);
  assert.equal(pb("it.each([1, 2])('a %s', (n) => { void n; });").length, 1);
});

test('vert : mots-clés dans des chaînes ou gabarits ne comptent pas', () => {
  assert.deepEqual(pb("const s = `it.skip('a', () => {})`;\nconst u = \"xit(\";"), []);
  assert.equal(masquer("a('it.skip(')").includes('skip'), false);
});

const lancer = (...args) =>
  spawnSync(process.execPath, ['outils/gardes/tests.mjs', ...args], { encoding: 'utf8' });

test('le canari est déclaré rouge par la garde (la garde n’est pas aveugle)', () => {
  const r = lancer('outils/canari');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /sans-assertion\.canari\.mjs:\d+ test sans assertion/);
  assert.match(r.stderr, /skip-sans-carte\.canari\.mjs:\d+ test sauté sans carte/);
});

test('le dépôt réel est vert', () => {
  const r = lancer();
  assert.equal(r.status, 0, r.stderr);
});

test('chemin inexistant = rouge', () => {
  assert.equal(lancer('outils/absent').status, 1);
});

test('vert : aide du fichier qui contient l’assertion ; rouge : aide sans assertion', () => {
  const bon = "const rouge = (x) => assert.ok(x);\nconst deux = (x) => rouge(x);\ntest('a', () => { deux(1); });\n";
  assert.deepEqual(pb(bon), []);
  const mauvais = "const noter = (x) => console.log(x);\ntest('a', () => { noter(1); });\n";
  assert.equal(pb(mauvais).length, 1);
});
