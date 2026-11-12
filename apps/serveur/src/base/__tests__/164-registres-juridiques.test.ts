import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Probleme = { fichier: string; code: string };
const garde = (await import(new URL('../../../../../outils/gardes/migrations.mjs', import.meta.url).href)) as {
  analyserMigration: (texte: string, nom: string) => Probleme[];
  analyserNoms: (noms: string[]) => Probleme[];
};
const NOM = '164-registres-juridiques.sql';
const sql = readFileSync(new URL(`../migrations/${NOM}`, import.meta.url), 'utf8');
const code = sql.replace(/--[^\n]*/g, '');
const table = (n: string): string => new RegExp(`CREATE TABLE IF NOT EXISTS a_compta\\.${n} \\(([\\s\\S]*?)\\n\\);`).exec(sql)?.[1] ?? '';
const TABLES = ['registre_decision', 'mouvement_titres'];

describe('164-registres-juridiques.sql', () => {
  it('passe-la-garde-migrations', () => {
    expect(garde.analyserMigration(sql, NOM)).toEqual([]);
    expect(garde.analyserNoms(['090-profil.sql', NOM])).toEqual([]);
    expect(code).not.toMatch(/CREATE\s+(TABLE|INDEX|SCHEMA)\s+(?!IF NOT EXISTS)|ADD\s+COLUMN\s+(?!IF NOT EXISTS)/i);
    expect(code).not.toMatch(/\b(DROP\s+TABLE|DROP\s+COLUMN|TRUNCATE|RENAME|DELETE\s+FROM|GRANT|REVOKE|CREATE\s+ROLE)\b/i);
  });

  it('deux-tables-presentes', () => {
    for (const t of TABLES) {
      expect(sql, t).toContain(`CREATE TABLE IF NOT EXISTS a_compta.${t} (`);
      const corps = table(t);
      expect(corps, t).toMatch(/societe_id text NOT NULL/);
      expect(corps, t).toMatch(/sequence bigint NOT NULL/);
      expect(corps, t).toMatch(/piece_id text NOT NULL/);
      expect(corps, t).toMatch(/horodatage timestamptz NOT NULL/);
      expect(corps, t).toMatch(/empreinte_precedente text/);
      expect(corps, t).toMatch(/empreinte text NOT NULL/);
      expect(corps, t).toMatch(/UNIQUE \(societe_id, sequence\)/);
    }
    expect(table('registre_decision')).toMatch(/objet text NOT NULL[\s\S]*date_decision date NOT NULL/);
    const m = table('mouvement_titres');
    expect(m).toMatch(/cedant_id text,/);
    expect(m).toMatch(/cessionnaire_id text NOT NULL/);
    expect(m).toMatch(/date_mouvement date NOT NULL/);
    expect(m).toMatch(/CHECK \(nombre > 0\)/);
    expect(code).not.toMatch(/CREATE TABLE IF NOT EXISTS (?!a_compta\.)/);
  });

  it('montants-en-bigint', () => {
    expect(table('mouvement_titres')).toMatch(/nombre bigint NOT NULL CHECK \(nombre > 0\)/);
    expect(table('mouvement_titres')).toMatch(/valeur_nominale_centimes bigint NOT NULL/);
    expect(code).not.toMatch(/\b(numeric|decimal|real|double precision|float|money)\b/i);
  });

  it('update-et-delete-refuses', () => {
    expect(sql).toContain("RAISE EXCEPTION 'ajout_seul'");
    for (const t of TABLES) {
      expect(sql, t).toMatch(new RegExp(`CREATE OR REPLACE TRIGGER ${t}_ajout_seul BEFORE UPDATE OR DELETE ON a_compta\\.${t}\\s+FOR EACH ROW EXECUTE FUNCTION a_compta\\.refuser_modification\\(\\)`));
    }
    expect(code).not.toMatch(/\bDROP\b/i);
  });
});
