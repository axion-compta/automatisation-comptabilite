import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { analyserTermine } from '../termine.mjs';

const fiche = (id, statut, plus = {}) => ({ fiche: { id, statut, depend_de: [], ...plus }, fichier: `${id}.md` });
const journal = (id, n = 3, fin = '') => [`# Journal ${id}`, ...Array(n - 1).fill('- ligne'), fin].filter(Boolean).join('\n');
const un = (statut, plus) => ({ 'L00-T01': fiche('L00-T01', statut, plus) });

test('vert : fait avec journal et dépendance faite ; a_faire sans journal', () => {
  const f = { ...un('fait'), 'L00-T02': fiche('L00-T02', 'fait', { depend_de: ['L00-T01'] }) };
  assert.deepEqual(analyserTermine(f, { 'L00-T01': journal('L00-T01'), 'L00-T02': journal('L00-T02', 10) }), []);
  assert.deepEqual(analyserTermine(un('a_faire'), {}), []);
});

test('rouge : journal absent, vide, trop long, mal titré', () => {
  assert.match(analyserTermine(un('fait'), {})[0], /fait sans journal/);
  assert.equal(analyserTermine(un('fait'), { 'L00-T01': '  \n' }).length, 1);
  assert.match(analyserTermine(un('fait'), { 'L00-T01': journal('L00-T01', 11) })[0], /11 lignes > 10/);
  assert.match(analyserTermine(un('fait'), { 'L00-T01': '# Autre\n- x' })[0], /doit commencer par/);
});

test('rouge : dépendance non faite ou introuvable, statut inconnu, id différent du fichier', () => {
  const f = { 'L00-T01': fiche('L00-T01', 'a_faire'), 'L00-T02': fiche('L00-T02', 'fait', { depend_de: ['L00-T01', 'L00-T99'] }) };
  const pb = analyserTermine(f, { 'L00-T02': journal('L00-T02') });
  assert.match(pb[0], /ne l’est pas/);
  assert.match(pb[1], /L00-T99 introuvable/);
  assert.match(analyserTermine(un('termine'), {})[0], /statut « termine » inconnu/);
  assert.match(analyserTermine({ 'L00-T01': fiche('L00-T02', 'a_faire') }, {})[0], /différent du nom/);
});

test("tests_requis oui : un fichier de test suivi doit être dans fichiers_autorises (une citation au journal ne suffit pas)", () => {
  const f = un('fait', { tests_requis: 'oui', fichiers_autorises: ['outils/x/**'] });
  const j = (fin) => ({ 'L00-T01': journal('L00-T01', 3, fin) });
  assert.match(analyserTermine(f, j(), ['outils/y/a.test.mjs'])[0], /tests_requis oui/);
  assert.deepEqual(analyserTermine(f, j(), ['outils/x/a.test.mjs']), []);
  for (const fin of ["- garde:tests vert", "- outils/y/a.test.mjs", "- a.test.mjs", "- outils/x/b.test.mjs (autre tâche)"]) {
    assert.equal(analyserTermine(f, j(fin), ["outils/y/a.test.mjs"]).length, 1, fin);
  }
  assert.deepEqual(analyserTermine(f, j()), []);
});

test('le dépôt réel est vert', () => {
  const r = spawnSync(process.execPath, ['outils/gardes/termine.mjs'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
});
