import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TABLES_PAR_PERSONNE } from '../depots-interface-transverse.js';

type Probleme = { fichier: string; code: string };
const garde = (await import(new URL('../../../../../outils/gardes/migrations.mjs', import.meta.url).href)) as {
  analyserMigration: (texte: string, nom: string) => Probleme[];
  analyserNoms: (noms: string[]) => Probleme[];
};
const NOM = '015-interface-transverse.sql';
const sql = readFileSync(new URL(`../migrations/${NOM}`, import.meta.url), 'utf8');
const TABLES = ['regle_alerte', 'alerte', 'alerte_journal', 'instantane_tdb', 'compteur_ecritures', 'compteur_menu', 'echeance',
  'preference_personne', 'resume_email_envoi', 'notification', 'terme', 'evenement_usage', 'export_fichier'];
const REFERENCES = ['regle_alerte', 'terme'];
const table = (n: string): string => new RegExp(`CREATE TABLE IF NOT EXISTS a_compta\\.${n} \\(([^;]*)\\);`).exec(sql)?.[1] ?? '';

describe('migration 015', () => {
  it('passe la garde migrations sans problème', () => {
    expect(garde.analyserMigration(sql, NOM)).toEqual([]);
    expect(garde.analyserNoms([NOM, '080-exploitation-rgpd.sql'])).toEqual([]);
  });
  it.each(TABLES)('table %s présente', (n) => { expect(table(n)).not.toBe(''); });
  it('societe_id NOT NULL sauf références et tables par personne', () => {
    for (const n of TABLES) {
      const sansSociete = [...REFERENCES, ...TABLES_PAR_PERSONNE].includes(n as never);
      if (sansSociete) expect(table(n)).not.toContain('societe_id');
      else expect(table(n)).toMatch(/societe_id text (NOT NULL|PRIMARY KEY)/);
    }
  });
  it('index unique partiel des alertes actives', () => {
    expect(sql).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS \w+ ON a_compta\.alerte \(societe_id, cle_dedoublonnage\) WHERE etat IN \('ouverte','reportee'\)/);
  });
  it('refus de UPDATE et DELETE sur alerte_journal', () => {
    expect(sql).toMatch(/BEFORE UPDATE OR DELETE ON a_compta\.alerte_journal/);
    expect(sql).toMatch(/RAISE EXCEPTION/);
  });
  it('rejouable, additive, argent en bigint', () => {
    expect(sql.match(/CREATE TABLE/g)).toHaveLength(TABLES.length);
    expect(sql.match(/CREATE TABLE IF NOT EXISTS/g)).toHaveLength(TABLES.length);
    expect(sql.match(/CREATE (UNIQUE )?INDEX/g)?.length).toBe(sql.match(/CREATE (UNIQUE )?INDEX IF NOT EXISTS/g)?.length);
    expect(sql).not.toMatch(/\b(DROP|RENAME|TRUNCATE|DELETE\s+FROM)\b/i);
    expect(sql).toMatch(/montant_centimes bigint/);
    expect(sql).not.toMatch(/montant_centimes (integer|numeric|real|double)/i);
    expect(sql).toMatch(/CHECK \(etat IN \('ouverte','reportee','fermee'\)\)/);
  });
});
