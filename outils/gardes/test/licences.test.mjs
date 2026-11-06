import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { analyserLicences, executer, licencePermise, lirePaquets } from '../licences.mjs';

function ecrire(r, entree, chemin, pkg) {
  const d = join(r, 'node_modules', '.pnpm', entree, 'node_modules', chemin);
  mkdirSync(d, { recursive: true });
  writeFileSync(join(d, 'package.json'), JSON.stringify(pkg));
}

test('cas vert : licences permises', () => {
  assert.deepEqual(analyserLicences([{ nom: 'a@1', licence: 'MIT' }, { nom: 'b@1', licence: '(MIT OR GPL-3.0-only)' }]), []);
});

test('rouge : licence incompatible', () => {
  const pb = analyserLicences([{ nom: 'c@1', licence: 'GPL-3.0-only' }]);
  assert.equal(pb.length, 1);
  assert.match(pb[0], /c@1/);
});

test('rouge : licence absente', () => {
  assert.equal(analyserLicences([{ nom: 'd@1' }]).length, 1);
  assert.equal(licencePermise(''), false);
});

test('rouge : AND avec un terme non permis', () => {
  assert.equal(licencePermise('MIT AND AGPL-3.0-only'), false);
  assert.equal(licencePermise('MIT AND ISC'), true);
});

test('lecture de node_modules/.pnpm fictif', () => {
  const r = mkdtempSync(join(tmpdir(), 'lic-'));
  try {
    ecrire(r, 'x@1', 'x', { name: 'x', version: '1.0.0', license: 'GPL-3.0-only' });
    ecrire(r, 'x@1-bis', 'x', { name: 'x', version: '1.0.0', license: 'GPL-3.0-only' });
    ecrire(r, '@s+y@1', '@s/y', { name: '@s/y', version: '2.0.0', license: { type: 'MIT' } });
    ecrire(r, 'z@1', 'z', { name: 'z', version: '3.0.0', licenses: [{ type: 'MIT' }, { type: 'ISC' }] });
    const p = lirePaquets(r);
    assert.equal(p.length, 3);
    const tri = [...p].sort((a, b) => a.nom.localeCompare(b.nom));
    assert.deepEqual(tri, [
      { nom: '@s/y@2.0.0', licence: 'MIT' },
      { nom: 'x@1.0.0', licence: 'GPL-3.0-only' },
      { nom: 'z@3.0.0', licence: 'MIT OR ISC' },
    ]);
    assert.equal(analyserLicences(p).length, 1);
    assert.deepEqual(lirePaquets(join(r, 'vide')), []);
  } finally {
    rmSync(r, { recursive: true, force: true });
  }
});

test('vert : MIT-0 est permise', () => {
  assert.equal(licencePermise('MIT-0'), true);
});

test('expressions SPDX : AND/OR/parenthèses', () => {
  assert.equal(licencePermise('GPL-3.0-only AND (MIT OR ISC)'), false);
  assert.equal(licencePermise('(MIT OR ISC) AND GPL-3.0-only'), false);
  assert.equal(licencePermise('(MIT OR GPL-3.0-only) AND ISC'), true);
  assert.equal(licencePermise('MIT OR GPL-3.0-only AND ISC'), true);
  assert.equal(licencePermise('(MIT'), false);
  assert.equal(licencePermise('MIT)'), false);
  assert.equal(licencePermise('MIT OR OR ISC'), false);
  assert.equal(licencePermise('MIT AND'), false);
});

test('WITH : exception hors liste dédiée = rouge', () => {
  assert.equal(licencePermise('GPL-3.0-only WITH Classpath-exception-2.0'), false);
  assert.equal(licencePermise('MIT WITH Autre-exception'), false);
  assert.equal(licencePermise('Apache-2.0 WITH LLVM-exception'), true);
  assert.equal(licencePermise('MIT WITH'), false);
});

test('executer : rouge sans node_modules/.pnpm, vert et rouge sinon', () => {
  const r = mkdtempSync(join(tmpdir(), 'lic-'));
  const err = console.error;
  const log = console.log;
  console.error = () => {};
  console.log = () => {};
  try {
    assert.equal(executer(r), 1);
    ecrire(r, 'a@1', 'a', { name: 'a', version: '1.0.0', license: 'MIT' });
    assert.equal(executer(r), 0);
    ecrire(r, 'b@1', 'b', { name: 'b', version: '1.0.0', license: 'AGPL-3.0-only' });
    assert.equal(executer(r), 1);
  } finally {
    console.error = err;
    console.log = log;
    rmSync(r, { recursive: true, force: true });
  }
});

test('licence-mit-or-incomplet : « MIT OR » sans second terme = rouge', () => {
  assert.equal(licencePermise('MIT OR'), false);
  assert.equal(licencePermise('MIT OR ISC'), true);
});

test('licence-minuscules : la casse compte', () => {
  assert.equal(licencePermise('mit'), false);
  assert.equal(licencePermise('mit OR isc'), false);
  assert.equal(licencePermise('MIT or ISC'), false);
});

test('licence-espaces-multiples : espaces et tabulations tolérés entre les jetons', () => {
  assert.equal(licencePermise('  MIT   OR   GPL-3.0-only  '), true);
  assert.equal(licencePermise('MIT \t AND   GPL-3.0-only'), false);
  assert.equal(licencePermise('Apache-2.0  WITH   LLVM-exception'), true);
});
