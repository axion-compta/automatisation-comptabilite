import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyserDepot, analyserTexte, SERVICE } from '../audit.mjs';

const hors = 'apps/serveur/src/autre/ecrivain.ts';

test('ecriture-hors-service-refusee-par-la-garde', () => {
  const sqls = [
    'INSERT INTO a_compta.tete_journal (x) VALUES (1)',
    'update a_compta.entree_journal set motif = $1',
    'DELETE   FROM tete_journal',
    'truncate table a_compta.entree_journal',
    'DROP TABLE a_compta.tete_journal',
    'ALTER TABLE a_compta.entree_journal DISABLE TRIGGER ALL',
    'insert\ninto a_compta.tete_journal',
    'INSERT INTO "a_compta"."tete_journal" (x) VALUES (1)',
    'UPDATE ONLY a_compta.tete_journal SET x = 1',
    'DELETE FROM ONLY "a_compta"."entree_journal"',
    'MERGE INTO a_compta.tete_journal t USING x ON true WHEN MATCHED THEN UPDATE SET n = 1',
    'COPY a_compta.entree_journal FROM STDIN',
    'COPY a_compta.entree_journal (motif) FROM STDIN',
  ];
  for (const s of sqls) {
    const pb = analyserTexte('const q = `' + s + '`;', hors);
    assert.equal(pb.length, 1, s);
    assert.match(pb[0], /hors du service d'audit/);
  }
});

test('lecture-par-copy-to-permise', () => {
  assert.deepEqual(analyserTexte('db.query(`COPY a_compta.tete_journal TO STDOUT`)', hors), []);
});

test('constantes-de-table-refusees-hors-service', () => {
  for (const s of ['INSERT INTO ${TABLE_TETE} (x) VALUES (1)', 'db.query(`DELETE FROM ${TABLE_ENTREES}`)']) {
    const pb = analyserTexte(s, hors);
    assert.equal(pb.length, 1, s);
    assert.match(pb[0], /hors du service d'audit/);
  }
  assert.deepEqual(analyserTexte('const t = TABLE_TETE;', SERVICE), []);
});

test('toutes-les-extensions-sont-lues', () => {
  for (const ext of ['ts', 'tsx', 'mts', 'cts', 'js', 'mjs', 'cjs', 'sql']) {
    const pb = analyserTexte('DELETE FROM a_compta.tete_journal', `apps/serveur/src/x/ecrivain.${ext}`);
    assert.equal(pb.length, 1, ext);
  }
  assert.deepEqual(analyserTexte('DELETE FROM a_compta.tete_journal', 'apps/serveur/src/x/ecrivain.test.mjs'), []);
});

test('vert : le service d’audit lui-même, les tests et les lectures', () => {
  const ecrit = 'INSERT INTO a_compta.tete_journal (x) VALUES (1)';
  assert.deepEqual(analyserTexte(ecrit, SERVICE), []);
  assert.deepEqual(analyserTexte(ecrit, 'apps/serveur/src/__tests__/x.test.ts'), []);
  assert.deepEqual(analyserTexte(ecrit, 'apps/serveur/src/x.test.ts'), []);
  assert.deepEqual(analyserTexte('SELECT * FROM a_compta.tete_journal FOR UPDATE', hors), []);
  assert.deepEqual(analyserTexte('INSERT INTO a_compta.alerte_journal (x) VALUES (1)', hors), []);
  assert.deepEqual(analyserTexte('CREATE TABLE IF NOT EXISTS a_compta.tete_journal (x int)', 'apps/serveur/src/base/migrations/092.sql'), []);
});

test('le numéro de ligne est celui du début de l’ordre', () => {
  const pb = analyserTexte('a\nb\nUPDATE a_compta.tete_journal SET x = 1', hors);
  assert.match(pb[0], /ecrivain\.ts:3 /);
});

test('analyserDepot agrège les fichiers lus', () => {
  const pb = analyserDepot([hors, 'apps/serveur/src/b.ts'], (f) => (f === hors ? 'DELETE FROM tete_journal' : 'rien'));
  assert.equal(pb.length, 1);
});
