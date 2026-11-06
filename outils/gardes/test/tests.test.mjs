import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { analyserTexte, masquer } from '../tests.mjs';

const pb = (t) => analyserTexte(t, 't.test.mjs');
const OK = 'expect(1).toBe(1);';
const corps = (c) => `test('a', () => { ${c} });`;

// Chaque cas rouge donne exactement un problème dont le message correspond.
const ROUGES = [
  [/1 test sans assertion/, "test('a', () => {\n  const x = 1;\n});"],
  [/sans assertion/, "it('expect(1)', () => {\n // expect(1).toBe(1)\n});"],
  [/sans assertion/, "it.each([1, 2])('a %s', (n) => { void n; });"],
  [/sans assertion/, "it.each`a|b`('x', () => { void 1; });"],
  [/sans assertion/, "test.concurrent.each([1])('a', () => { void 1; });"],
  ...['const expected = 1; expected.toString();', 'failures.push(1);', 'assertionsLog();', 'verifierRien();'].map((c) => [/sans assertion/, corps(c)]),
  [/sans assertion/, "const aide = () => 0;\nbeforeEach(() => { assert.ok(1); });\ntest('a', () => { aide(); });"],
  [/sans assertion/, "const bon = () => assert.ok(1); const aide = () => 0;\ntest('a', () => { aide(); });"],
  [/sans assertion/, "const noter = (x) => console.log(x);\ntest('a', () => { noter(1); });"],
  [/sans assertion/, "test('a', () => { /assert.ok(/.test('x'); });"],
  ...[
    `it.skip('a', () => { ${OK} });`,
    `xit('a', () => { ${OK} });`,
    "it.todo('a');",
    `test.skipIf(c)('a', () => { ${OK} });`,
    `it.runIf(c)('a', () => { ${OK} });`,
    `it.skip.each([1])('a', () => { ${OK} });`,
    `test('a', { skip: true }, () => { ${OK} });`,
    `test('a', { todo: true }, () => { ${OK} });`,
    `const o = { todo: true }; test('a', o, () => { ${OK} });`,
    `test('a', (t) => { t.todo(); ${OK} });`,
    "describe.skip('a', () => {});",
    "describe.skipIf(c)('a', () => {});",
    "describe.runIf(c)('a', () => {});",
    "describe.concurrent.skip('a', () => {});",
    "describe.skip.each([1])('a', () => {});",
    "suite.shuffle.skip('a', () => {});",
    "describe('a', { skip: true }, () => {});",
  ].map((t) => [/sans carte/, t]),
  ...[
    "describe.only('a', () => {});",
    "suite.only('a', () => {});",
    `test('a', { only: true }, () => { ${OK} });`,
    `test.only.each([1])('a', () => { ${OK} });`,
    `it.concurrent.only('a', () => { ${OK} });`,
    `describe.concurrent.only('a', () => {});`,
    `test.sequential.only('a', () => { ${OK} });`,
    `test.fails.only('a', () => { ${OK} });`,
    "describe.skip.only('a', () => {});",
  ].map((t) => [/\.only interdit/, t]),
];

test('rouge : chaque forme fautive est détectée', () => {
  for (const [motif, t] of ROUGES) {
    const r = pb(t);
    assert.ok(r.length >= 1 && r.some((p) => motif.test(p)), `${t} → ${r}`);
  }
  assert.match(pb("test('a', () => {\n  const x = 1;\n});")[0], /t\.test\.mjs:1 /);
});

test('vert : assertions reconnues, cartes, aides, regex, chaînes', () => {
  const VERTS = [
    `it('a', () => { ${OK} });`,
    corps('assert.equal(1, 1);'),
    "test('a', async (t) => { t.assert.ok(true); });",
    corps('await expect(p).rejects.toThrow();'),
    "it.each([1, 2])('a %s', (n) => { expect(n).toBeTruthy(); });",
    "test.concurrent.each([1])('a', () => { expect(1).toBe(1); });",
    `it.skip('a [L01-T02]', () => { ${OK} });`,
    `// carte L01-T02\nxit('a', () => { ${OK} });`,
    "const rouge = (x) => assert.ok(x);\nconst deux = (x) => rouge(x);\ntest('a', () => { deux(1); });",
    "describe('g', () => {\n  const verif = (x) => {\n    assert.ok(x);\n  };\n  test('a', () => { verif(1); });\n});",
    "const r = /'/;\ntest('a', () => { assert.ok(r.test('x')); });",
    "const s = `it.skip('a', () => {})`;\nconst u = \"xit(\", v = { skip: false };",
  ];
  for (const t of VERTS) assert.deepEqual(pb(t), [], t);
  assert.equal(masquer("a('it.skip(')").includes('skip'), false);
});

const lancer = (...args) => spawnSync(process.execPath, ['outils/gardes/tests.mjs', ...args], { encoding: 'utf8' });

test('le canari est déclaré rouge par la garde (la garde n’est pas aveugle)', () => {
  const r = lancer('outils/canari');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /sans-assertion\.canari\.mjs:\d+ test sans assertion/);
  assert.match(r.stderr, /skip-sans-carte\.canari\.mjs:\d+ test sauté ou conditionnel sans carte/);
  assert.match(r.stderr, /only\.canari\.mjs:\d+ \.only interdit/);
  assert.match(r.stderr, /vide\.canari\.mjs:\d+ test sans assertion/);
});

test('le dépôt réel est vert ; chemin inexistant = rouge', () => {
  assert.equal(lancer().status, 0);
  assert.equal(lancer('outils/absent').status, 1);
});
