import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { analyserLicences, licencePermise, lirePaquets } from '../licences.mjs';

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
  const d = join(r, 'node_modules', '.pnpm', 'x@1', 'node_modules', 'x');
  mkdirSync(d, { recursive: true });
  writeFileSync(join(d, 'package.json'), JSON.stringify({ name: 'x', version: '1.0.0', license: 'GPL-3.0-only' }));
  const p = lirePaquets(r);
  assert.deepEqual(p, [{ nom: 'x@1.0.0', licence: 'GPL-3.0-only' }]);
  assert.equal(analyserLicences(p).length, 1);
  assert.deepEqual(lirePaquets(join(r, 'vide')), []);
});

test('vert : MIT-0 est permise', () => {
  assert.equal(licencePermise('MIT-0'), true);
});
