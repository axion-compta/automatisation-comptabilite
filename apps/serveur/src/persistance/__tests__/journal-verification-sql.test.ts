import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(new URL('../sql/a_compta-journal-verification.sql', import.meta.url), 'utf8');
const COLONNES = ['id', 'societe', 'horodatage', 'declencheur', 'regle_id', 'version_regle', 'objet_type', 'objet_id', 'resultat', 'valeur', 'ecart_centimes', 'version_parametres'];
const AJOUTEES = ['exigence', 'regle_code', 'bloque', 'declencheurs', 'phase', 'test_id', 'parametres', 'actif'];
const corpsTable = /CREATE TABLE IF NOT EXISTS a_compta\.journal_verification \(([\s\S]*?)\n\);/.exec(sql)?.[1] ?? '';

describe('migration SQL du journal de vérification (texte)', () => {
  it('table-et-12-colonnes', () => {
    const noms = corpsTable.split('\n').map((l) => l.trim().split(/\s+/)[0]).filter((n): n is string => !!n);
    expect(noms).toEqual(COLONNES);
  });
  it('index-societe-objet-horodatage', () => {
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS \w+\s+ON a_compta\.journal_verification \(societe, objet_type, objet_id, horodatage\)/);
  });
  it('declencheur-update-delete', () => {
    expect(sql).toMatch(/BEFORE UPDATE OR DELETE ON a_compta\.journal_verification/);
    expect(sql).toMatch(/RAISE EXCEPTION/);
  });
  it('huit-colonnes-regle-controle', () => {
    for (const c of AJOUTEES) expect(sql).toContain(`ALTER TABLE a_compta.regle_controle ADD COLUMN IF NOT EXISTS ${c} `);
    expect(sql.match(/ALTER TABLE a_compta\.regle_controle/g)).toHaveLength(AJOUTEES.length);
  });
  it('rejouable', () => {
    const instructions = sql.split(';').map((s) => s.replace(/--.*$/gm, '').trim()).filter((s) => s !== '');
    for (const i of instructions) {
      if (/^CREATE (TABLE|INDEX)/.test(i)) expect(i).toContain('IF NOT EXISTS');
      if (/^CREATE (OR REPLACE )?(FUNCTION|TRIGGER)/.test(i)) expect(i).toContain('OR REPLACE');
    }
  });
  it('ajout-seul-ni-drop-ni-rename', () => {
    const code = sql.replace(/--.*$/gm, '');
    expect(code).not.toMatch(/\bDROP\b/i);
    expect(code).not.toMatch(/\bRENAME\b/i);
  });
});
