import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyserMigration, analyserNoms, analyserModifications, analyserDossier } from '../migrations.mjs';

const codes = (sql) => analyserMigration(sql, '001-a.sql').map((p) => p.code);
const mots = (sql) => analyserMigration(sql, '001-a.sql').map((p) => p.mot);

test('dossier-absent-vert', () => {
  assert.deepEqual(analyserDossier({ fichiers: [], modifies: [] }), []);
  assert.deepEqual(analyserMigration('', '001-a.sql'), []);
  assert.deepEqual(analyserMigration('\r\n\r\n', '001-a.sql'), []);
  assert.deepEqual(analyserNoms([]), []);
  assert.deepEqual(analyserModifications([]), []);
});

test('ajout-de-table-et-colonne-vert', () => {
  const vert = [
    'CREATE TABLE client (id integer PRIMARY KEY, nom text);',
    'ALTER TABLE client ADD COLUMN ville text;',
    'ALTER TABLE client ADD COLUMN actif boolean DEFAULT true NOT NULL;',
    'CREATE INDEX idx_a ON client (nom);\nDROP INDEX CONCURRENTLY IF EXISTS idx_a;',
    'CREATE TABLE ligne (id integer, c integer REFERENCES client(id) ON DELETE CASCADE ON UPDATE CASCADE);',
    'UPDATE client SET ville = 1 WHERE id = 2;',
    'CREATE FUNCTION f() RETURNS void AS $$ BEGIN DELETE FROM t; DROP TABLE x; END $$ LANGUAGE plpgsql;',
    'CREATE FUNCTION g() RETURNS void AS $corps$ TRUNCATE t; $corps$ LANGUAGE sql;',
  ];
  for (const sql of vert) assert.deepEqual(codes(sql), [], sql);
  assert.deepEqual(codes('ALTER TABLE t ADD COLUMN a numeric(10,2) DEFAULT 0 NOT NULL, ADD COLUMN b text;'), []);
});

test('drop-column-rouge', () => {
  const rouge = [
    ['DROP TABLE client;', 'DROP TABLE'],
    ['drop table client;', 'DROP TABLE'],
    ['ALTER TABLE client DROP COLUMN ville;', 'DROP COLUMN'],
    ['DROP SCHEMA s;', 'DROP SCHEMA'],
    ['DROP\r\n  TABLE client;', 'DROP TABLE'],
    ['DROP INDEX idx_inconnu;', 'DROP INDEX'],
    ['CREATE INDEX idx_a ON t (a);\nDROP INDEX idx_a;', 'DROP INDEX'],
    ['DROP INDEX CONCURRENTLY IF EXISTS idx_autre;', 'DROP INDEX'],
    ['TRUNCATE client;', 'TRUNCATE'],
    ['DELETE FROM client WHERE id = 1;', 'DELETE'],
    ['UPDATE client SET a = 1;', 'UPDATE'],
    ['ALTER TABLE t ALTER COLUMN a TYPE bigint;', 'ALTER COLUMN TYPE'],
    ['ALTER TABLE t ALTER COLUMN a SET DATA TYPE bigint;', 'ALTER COLUMN TYPE'],
    ['ALTER TABLE t ALTER COLUMN a SET NOT NULL;', 'ALTER COLUMN SET NOT NULL'],
  ];
  for (const [sql, mot] of rouge) {
    assert.deepEqual(codes(sql), ['ordre_destructeur'], sql);
    assert.deepEqual(mots(sql), [mot], sql);
  }
  assert.equal(analyserMigration('\n\nDROP TABLE x;', 'm.sql')[0].ligne, 3);
  assert.equal(analyserMigration('DROP TABLE x;', 'm.sql')[0].fichier, 'm.sql');
});

test('rename-rouge', () => {
  for (const sql of ['ALTER TABLE a RENAME TO b;', 'ALTER TABLE a RENAME COLUMN x TO y;', 'alter table a\n rename to b;']) {
    assert.deepEqual(mots(sql), ['RENAME'], sql);
  }
});

test('not-null-sans-default-rouge', () => {
  assert.deepEqual(mots('ALTER TABLE t ADD COLUMN a integer NOT NULL;'), ['ADD COLUMN NOT NULL']);
  assert.deepEqual(mots('ALTER TABLE t ADD COLUMN a numeric(10,2) NOT NULL, ADD COLUMN b text;'), ['ADD COLUMN NOT NULL']);
  assert.deepEqual(mots('ALTER TABLE t ADD COLUMN b text, ADD COLUMN a integer NOT NULL;'), ['ADD COLUMN NOT NULL']);
  assert.deepEqual(codes('ALTER TABLE t ADD COLUMN a integer NOT NULL DEFAULT 0;'), []);
  assert.deepEqual(codes('ALTER TABLE t ADD COLUMN a integer DEFAULT 0 NOT NULL;'), []);
  assert.deepEqual(codes('ALTER TABLE t ADD COLUMN a integer;'), []);
});

test('commentaire-et-chaine-ignores', () => {
  const vert = [
    '-- DROP TABLE x',
    '/* DROP TABLE x\n TRUNCATE y; */',
    "INSERT INTO t VALUES ('DROP TABLE');",
    "INSERT INTO t VALUES ('l''ordre DROP TABLE');",
    "COMMENT ON TABLE t IS 'RENAME -- et /* TRUNCATE';",
    'SELECT 1; -- DELETE FROM t\r\n',
  ];
  for (const sql of vert) assert.deepEqual(codes(sql), [], sql);
  assert.deepEqual(mots("SELECT 'x'; DROP TABLE t; -- fin"), ['DROP TABLE']);
  assert.deepEqual(mots('/* a */ DROP TABLE t;'), ['DROP TABLE']);
});

test('numero-en-double-rouge', () => {
  const c = (noms) => analyserNoms(noms).map((p) => `${p.fichier}:${p.code}`);
  assert.deepEqual(analyserNoms(['001-a.sql', '002-b.sql', '010-c-d.sql']), []);
  assert.deepEqual(c(['001-a.sql', '001-b.sql']), ['001-b.sql:numero_en_double']);
  assert.deepEqual(c(['apps/serveur/src/base/migrations/001-a.sql', '001-b.sql']), ['001-b.sql:numero_en_double']);
  for (const n of ['1-a.sql', '0001-a.sql', '001.sql', '001-A.sql', '001-a.txt', 'a-001.sql', '001-a_b.sql', '']) {
    assert.deepEqual(c([n]), [`${n}:nom_invalide`], n);
  }
  assert.deepEqual(c(['002-a.sql', '001-b.sql']), ['001-b.sql:ordre_inverse']);
});

test('migration-modifiee-rouge', () => {
  const d = 'apps/serveur/src/base/migrations/';
  const c = (l) => analyserModifications(l).map((p) => `${p.fichier}:${p.code}`);
  assert.deepEqual(c([`M\t${d}001-a.sql`]), [`${d}001-a.sql:migration_modifiee`]);
  assert.deepEqual(c([`D\t${d}001-a.sql`]), [`${d}001-a.sql:migration_modifiee`]);
  assert.deepEqual(c([`R100\t${d}001-a.sql\t${d}002-b.sql`]), [`${d}001-a.sql:migration_modifiee`]);
  assert.deepEqual(c([`A\t${d}003-c.sql`, 'M\tREADME.md', `M\tautre/${d}x.sql`, '']), []);
  assert.deepEqual(analyserDossier({ fichiers: [], modifies: [`M\t${d}001-a.sql`] }).map((p) => p.code), ['migration_modifiee']);
});
