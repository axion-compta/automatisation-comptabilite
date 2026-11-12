import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { comparerDossiers } from '../comparer.mjs';
import { validerImage } from '../lancer.mjs';

const fabriquer = (fichiers) => {
  const d = mkdtempSync(join(tmpdir(), 'captures-'));
  for (const [nom, octets] of Object.entries(fichiers)) writeFileSync(join(d, nom), Buffer.from(octets));
  return d;
};
const avec = (a, b, verifier) => {
  const da = fabriquer(a);
  const db = fabriquer(b);
  try { verifier(comparerDossiers(da, db)); } finally { rmSync(da, { recursive: true }); rmSync(db, { recursive: true }); }
};
const base = { 'e01-1280.png': [1, 2, 3], 'e01-390.png': [4, 5, 6] };

test('dossiers-identiques-ok', () => {
  avec(base, { ...base }, (pb) => assert.deepEqual(pb, []));
});

test('dossiers-vides-refuses', () => {
  avec({}, {}, (pb) => assert.ok(pb.some((p) => p.includes('aucune capture'))));
});

test('un-octet-different-refuse', () => {
  avec(base, { ...base, 'e01-390.png': [4, 5, 7] }, (pb) => assert.deepEqual(pb, ['capture différente : e01-390.png']));
  avec(base, { ...base, 'e01-390.png': [4, 5, 6, 0] }, (pb) => assert.equal(pb.length, 1));
});

test('capture-manquante-refusee', () => {
  avec(base, { 'e01-1280.png': [1, 2, 3] }, (pb) => assert.deepEqual(pb, ['capture manquante au second passage : e01-390.png']));
  avec({ 'e01-1280.png': [1, 2, 3] }, base, (pb) => assert.deepEqual(pb, ['capture manquante au premier passage : e01-390.png']));
});

test('dossier-absent-refuse', () => {
  const pb = comparerDossiers(join(tmpdir(), 'dossier-inexistant-a'), join(tmpdir(), 'dossier-inexistant-b'));
  assert.ok(pb.length > 0);
});

test('autres-fichiers-ignores', () => {
  const dossier = fabriquer(base);
  mkdirSync(join(dossier, 'sous-dossier'));
  writeFileSync(join(dossier, 'notes.txt'), 'x');
  assert.deepEqual(comparerDossiers(dossier, dossier), []);
  rmSync(dossier, { recursive: true });
});

test('image-sans-empreinte-refusee', () => {
  const empreinte = '0123456789abcdef'.repeat(4);
  const ok = `exemple.fr/playwright:v1@sha256:${empreinte}`;
  assert.equal(validerImage(`${ok}\n`), ok);
  for (const mauvaise of ['', '  ', 'exemple.fr/playwright:v1', `exemple.fr/playwright:v1@sha256:${empreinte.slice(1)}`, `exemple.fr/playwright:v1@sha256:${empreinte.toUpperCase()}`, `${ok}\nautre`, 'image@sha256:' + 'g'.repeat(64), undefined, 42]) {
    assert.throws(() => validerImage(mauvaise), /empreinte|image/, String(mauvaise));
  }
});
