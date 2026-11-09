import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Probleme = { fichier: string; code: string };
const garde = (await import(new URL('../../../../../outils/gardes/migrations.mjs', import.meta.url).href)) as {
  analyserMigration: (texte: string, nom: string) => Probleme[];
  analyserNoms: (noms: string[]) => Probleme[];
};
const NOM = '090-profil.sql';
const sql = readFileSync(new URL(`../migrations/${NOM}`, import.meta.url), 'utf8');
const code = sql.replace(/--[^\n]*/g, '');
const table = (n: string): string => new RegExp(`CREATE TABLE IF NOT EXISTS a_compta\\.${n} \\(([\\s\\S]*?)\\n\\);`).exec(sql)?.[1] ?? '';
const TABLES = ['champ_profil', 'regime_imposition_societe', 'taille_comptable_exercice', 'dirigeant_associe', 'parametre_lecture'];
const CONFIRME = /CHECK \(statut <> 'confirme' OR confirme_par IS NOT NULL\)/;

describe('090-profil.sql', () => {
  it('passe la garde migrations, rejouable et additive', () => {
    expect(garde.analyserMigration(sql, NOM)).toEqual([]);
    expect(garde.analyserNoms(['080-exploitation-rgpd.sql', NOM])).toEqual([]);
    expect(code).not.toMatch(/CREATE\s+(TABLE|INDEX|SCHEMA)\s+(?!IF NOT EXISTS)|ADD\s+COLUMN\s+(?!IF NOT EXISTS)/i);
    expect(code).not.toMatch(/\b(DROP\s+TABLE|DROP\s+COLUMN|TRUNCATE|RENAME|DELETE\s+FROM|GRANT|REVOKE|CREATE\s+ROLE)\b/i);
  });

  it('crée chaque table dans a_compta avec societe_id non nul', () => {
    for (const t of [...TABLES, 'societe', 'regime_tva_societe', 'parametre_date']) expect(sql, t).toContain(`CREATE TABLE IF NOT EXISTS a_compta.${t} (`);
    for (const t of TABLES) expect(table(t), t).toMatch(/societe_id text NOT NULL/);
    expect(code).not.toMatch(/CREATE TABLE IF NOT EXISTS (?!a_compta\.)/);
    for (const t of ['societe', 'regime_tva_societe', 'parametre_date']) expect(sql).toContain(`ALTER TABLE a_compta.${t}\n  ADD COLUMN IF NOT EXISTS`);
  });

  it('porte la contrainte de non-chevauchement, le CHECK sur confirme_par et les montants en bigint', () => {
    expect(table('regime_imposition_societe')).toMatch(/EXCLUDE USING gist \(\s*societe_id WITH =, daterange\(effet_debut, effet_fin, '\[\)'\) WITH &&/);
    expect(table('champ_profil')).toMatch(CONFIRME);
    expect(table('regime_imposition_societe')).toMatch(CONFIRME);
    expect(table('taille_comptable_exercice')).toMatch(/total_bilan_centimes bigint[\s\S]*ca_net_centimes bigint/);
    expect(code).not.toMatch(/\b(numeric|decimal|real|double precision|float|money)\b/i);
  });

  it('refuse UPDATE et DELETE de champ_profil et parametre_lecture par un déclencheur', () => {
    expect(sql).toContain("RAISE EXCEPTION 'ajout_seul'");
    for (const t of ['champ_profil', 'parametre_lecture']) {
      expect(sql, t).toMatch(new RegExp(`CREATE OR REPLACE TRIGGER ${t}_ajout_seul BEFORE UPDATE OR DELETE ON a_compta\\.${t}\\s+FOR EACH ROW EXECUTE FUNCTION a_compta\\.refuser_modification\\(\\)`));
    }
    expect(code).not.toMatch(/\bDROP\b/i);
    expect(sql).not.toContain('regime_imposition_societe_ajout_seul');
  });
});
