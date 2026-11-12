import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CANAUX } from '../../../../../packages/noyau/src/principes/brouillon.js';

type Probleme = { fichier: string; code: string };
const garde = (await import(new URL('../../../../../outils/gardes/migrations.mjs', import.meta.url).href)) as {
  analyserMigration: (texte: string, nom: string) => Probleme[];
  analyserNoms: (noms: string[]) => Probleme[];
};
const NOM = '170-action-historique.sql';
const sql = readFileSync(new URL(`../migrations/${NOM}`, import.meta.url), 'utf8');
const code = sql.replace(/--[^\n]*/g, '');

describe('170-action-historique.sql', () => {
  it('passe-la-garde-migrations', () => {
    expect(garde.analyserMigration(sql, NOM)).toEqual([]);
    expect(garde.analyserNoms(['164-registres-juridiques.sql', NOM])).toEqual([]);
    expect(code).toContain('CREATE TABLE IF NOT EXISTS a_compta.action_historique (');
    expect(code).toMatch(/societe_id text NOT NULL/);
    expect(code).toMatch(/CREATE INDEX IF NOT EXISTS \w+ ON a_compta\.action_historique \(societe_id, le\)/);
    expect(code).toMatch(/CREATE INDEX IF NOT EXISTS \w+ ON a_compta\.action_historique \(societe_id, canal, le\)/);
    expect(code).not.toMatch(/CREATE\s+(TABLE|INDEX|SCHEMA)\s+(?!IF NOT EXISTS)/i);
    expect(code).not.toMatch(/\b(DROP|TRUNCATE|RENAME|DELETE\s+FROM)\b/i);
    expect(code).toMatch(/avant jsonb/);
    expect(code).toMatch(/apres jsonb/);
  });

  it('canal-hors-liste-refuse-par-check', () => {
    expect(code).toMatch(/canal text NOT NULL CHECK \(canal IN \('clic', 'chat', 'voix', 'import', 'assistant', 'expert', 'api'\)\)/);
    expect(code).toContain("RAISE EXCEPTION 'ajout_seul'");
    expect(code).toMatch(/CREATE OR REPLACE TRIGGER action_historique_ajout_seul BEFORE UPDATE OR DELETE ON a_compta\.action_historique\s+FOR EACH ROW/);
  });

  it('canaux-egaux-au-noyau', () => {
    const liste = /CHECK \(canal IN \(([^)]*)\)\)/.exec(code)?.[1] ?? '';
    const lus = [...liste.matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect(lus.length).toBe(CANAUX.length);
    expect([...lus].sort()).toEqual([...CANAUX].sort());
  });
});
