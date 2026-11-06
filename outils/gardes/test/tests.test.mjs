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
  assert.match(r.stderr, /only\.canari\.mjs:\d+ \.only interdit/);
  assert.match(r.stderr, /vide\.canari\.mjs:\d+ test sans assertion/);
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

test('rouge : .only sous toutes ses formes', () => {
  for (const t of ["describe.only('a', () => {});", "suite.only('a', () => {});", "test('a', { only: true }, () => { assert.ok(1); });"]) {
    assert.match(pb(t)[0], /\.only interdit/, t);
  }
});

test('rouge : faux amis de l’assertion', () => {
  for (const c of ['const expected = 1; expected.toString();', 'failures.push(1);', 'assertionsLog();', 'verifierRien();']) {
    assert.match(pb(`test('a', () => { ${c} });`)[0], /sans assertion/, c);
  }
});

test('rouge : aide contournée (beforeEach, aide sans assertion, deux déclarations) ; vert : aide en retrait', () => {
  const hook = "const aide = () => 0;\nbeforeEach(() => { assert.ok(1); });\ntest('a', () => { aide(); });";
  const deux = "const bon = () => assert.ok(1); const aide = () => 0;\ntest('a', () => { aide(); });";
  assert.equal(pb(hook).length, 1);
  assert.equal(pb(deux).length, 1);
  const retrait = "describe('g', () => {\n  const verif = (x) => {\n    assert.ok(x);\n  };\n  test('a', () => { verif(1); });\n});";
  assert.deepEqual(pb(retrait), []);
});

test('rouge : skipIf, runIf, todo, t.todo, each à gabarit, chaîne de modificateurs', () => {
  const ok = 'expect(1).toBe(1);';
  for (const t of [
    `test.skipIf(c)('a', () => { ${ok} });`,
    `it.runIf(c)('a', () => { ${ok} });`,
    `test('a', { todo: true }, () => { ${ok} });`,
    `test('a', (t) => { t.todo(); ${ok} });`,
    `it.skip.each([1])('a', () => { ${ok} });`,
  ]) {
    assert.match(pb(t)[0], /sans carte/, t);
  }
  assert.equal(pb('it.each`a|b`(\'x\', () => { void 1; });').length, 1);
  assert.equal(pb("test.concurrent.each([1])('a', () => { void 1; });").length, 1);
  assert.deepEqual(pb("test.concurrent.each([1])('a', () => { expect(1).toBe(1); });"), []);
});

test('regex : un littéral contenant une apostrophe ne fausse pas le masquage ; son contenu ne compte pas', () => {
  assert.deepEqual(pb("const r = /'/;\ntest('a', () => { assert.ok(r.test('x')); });"), []);
  assert.equal(pb("test('a', () => { /assert.ok(/.test('x'); });").length, 1);
});
