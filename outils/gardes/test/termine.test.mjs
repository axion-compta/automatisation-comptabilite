import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { analyserTermine } from '../termine.mjs';

const fiche = (id, statut, depend_de = []) => ({ fiche: { id, statut, depend_de }, fichier: `${id}.md` });
const journal = (id, n = 3) => [`# Journal ${id}`, ...Array(n - 1).fill('- ligne')].join('\n');

test('vert : fait avec journal et dépendance faite', () => {
  const f = { 'L00-T01': fiche('L00-T01', 'fait'), 'L00-T02': fiche('L00-T02', 'fait', ['L00-T01']) };
  const j = { 'L00-T01': journal('L00-T01'), 'L00-T02': journal('L00-T02', 10) };
  assert.deepEqual(analyserTermine(f, j), []);
});

test('rouge : fait sans journal, journal vide', () => {
  const f = { 'L00-T01': fiche('L00-T01', 'fait') };
  assert.match(analyserTermine(f, {})[0], /fait sans journal/);
  assert.equal(analyserTermine(f, { 'L00-T01': '  \n' }).length, 1);
});

test('rouge : journal de 11 lignes ou mal titré', () => {
  const f = { 'L00-T01': fiche('L00-T01', 'fait') };
  assert.match(analyserTermine(f, { 'L00-T01': journal('L00-T01', 11) })[0], /11 lignes > 10/);
  assert.match(analyserTermine(f, { 'L00-T01': '# Autre\n- x' })[0], /doit commencer par/);
});

test('rouge : fait alors qu’une dépendance ne l’est pas, ou est introuvable', () => {
  const f = { 'L00-T01': fiche('L00-T01', 'a_faire'), 'L00-T02': fiche('L00-T02', 'fait', ['L00-T01', 'L00-T99']) };
  const pb = analyserTermine(f, { 'L00-T02': journal('L00-T02') });
  assert.equal(pb.length, 2);
  assert.match(pb[0], /ne l’est pas/);
  assert.match(pb[1], /L00-T99 introuvable/);
});

test('vert : a_faire sans journal ; rouge : statut inconnu ou id différent du fichier', () => {
  assert.deepEqual(analyserTermine({ 'L00-T01': fiche('L00-T01', 'a_faire') }, {}), []);
  assert.match(analyserTermine({ 'L00-T01': fiche('L00-T01', 'termine') }, {})[0], /statut « termine » inconnu/);
  assert.match(analyserTermine({ 'L00-T01': fiche('L00-T02', 'a_faire') }, {})[0], /différent du nom/);
});

test('le dépôt réel est vert', () => {
  const r = spawnSync(process.execPath, ['outils/gardes/termine.mjs'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
});
