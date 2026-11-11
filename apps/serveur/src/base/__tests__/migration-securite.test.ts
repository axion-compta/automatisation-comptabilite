import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Probleme = { fichier: string; code: string };
const garde = (await import(new URL('../../../../../outils/gardes/migrations.mjs', import.meta.url).href)) as {
  analyserMigration: (texte: string, nom: string) => Probleme[];
  analyserNoms: (noms: string[]) => Probleme[];
};
const NOM = '092-securite.sql';
const sql = readFileSync(new URL(`../migrations/${NOM}`, import.meta.url), 'utf8');
const code = sql.replace(/--[^\n]*/g, '');
const TABLES = ['personne', 'acces_expert', 'regle_permission', 'horloge_vue', 'tete_journal', 'signalement', 'jeton_integration'];
const table = (n: string): string => new RegExp(`CREATE TABLE IF NOT EXISTS a_compta\\.${n} \\(([\\s\\S]*?)\\n\\);`).exec(sql)?.[1] ?? '';
const colonnes = (n: string): string[] =>
  table(n).split('\n').map((l) => /^ {2}([a-z_]+) /.exec(l)?.[1]).filter((c): c is string => c !== undefined && c !== 'CONSTRAINT' && c !== 'PRIMARY' && c !== 'FOREIGN' && c !== 'UNIQUE');

describe('092-securite.sql', () => {
  it('migrer-deux-fois-sans-changement', () => {
    expect(garde.analyserMigration(sql, NOM)).toEqual([]);
    expect(garde.analyserNoms(['091-autre.sql', NOM, '093-autre.sql'])).toEqual([]);
    expect(code).not.toMatch(/CREATE\s+(TABLE|INDEX|UNIQUE INDEX|SCHEMA)\s+(?!IF NOT EXISTS)/i);
    expect(code.match(/CREATE TABLE/g)).toHaveLength(TABLES.length);
    expect(code).not.toMatch(/ADD\s+COLUMN\s+(?!IF NOT EXISTS)/i);
  });

  it('aucun-champ-secret (T-CNX-7)', () => {
    for (const t of TABLES) {
      expect(colonnes(t).length, t).toBeGreaterThan(0);
      for (const c of colonnes(t)) expect(c, `${t}.${c}`).not.toMatch(/mot_de_passe|motdepasse|password|token|secret|(^|_)code($|_)/);
    }
  });

  it('societe-id-partout', () => {
    for (const t of TABLES) expect(table(t), t).toMatch(/societe_id text NOT NULL/);
    expect(code).not.toMatch(/CREATE TABLE IF NOT EXISTS (?!a_compta\.)/);
    expect(code).not.toMatch(/\b(EXECUTE|GRANT|SECURITY\s+DEFINER)\b/i);
    expect(code).not.toMatch(/\b(DROP|TRUNCATE|RENAME|DELETE\s+FROM)\b/i);
    expect(code).not.toMatch(/\baction_historique\b/);
  });

  it('cle-composee-refuse-autre-societe (C03)', () => {
    expect(table('personne')).toMatch(/PRIMARY KEY \(societe_id, personne_id\)/);
    for (const t of ['acces_expert', 'horloge_vue', 'signalement', 'jeton_integration']) {
      expect(table(t), t).toMatch(/FOREIGN KEY \(societe_id, \w+\) REFERENCES a_compta\.personne \(societe_id, personne_id\)/);
    }
    const toutes = TABLES.flatMap((t) => [...table(t).matchAll(/REFERENCES ([\w.]+) \(([^)]*)\)/g)].map((m) => ({ t, cible: m[1], cols: m[2] })));
    expect(toutes.length).toBeGreaterThanOrEqual(4);
    for (const r of toutes) expect(r.cols, `${r.t} -> ${r.cible}`).toMatch(/^societe_id,/);
    expect(table('signalement')).not.toMatch(/ecriture/);
  });

  it('demonstration-et-reelle-non-liees (C22)', () => {
    expect(table('personne')).toMatch(/mode text NOT NULL CHECK \(mode IN \('reelle','demonstration'\)\)/);
    expect(code).not.toMatch(/\b(societe_reelle|societe_demo\w*|reelle_id|demonstration_id)\b/);
    for (const t of TABLES) expect(table(t), t).not.toMatch(/REFERENCES a_compta\.societe\b/);
  });

  it('interrupteur fermé, matrice en donnée, journal sans déclencheur', () => {
    expect(table('jeton_integration')).toMatch(/actif boolean NOT NULL DEFAULT false/);
    expect(table('regle_permission')).toMatch(/role text NOT NULL[\s\S]*action text NOT NULL[\s\S]*autorise boolean NOT NULL/);
    expect(table('tete_journal')).toMatch(/empreinte text NOT NULL/);
    expect(code).not.toMatch(/\bTRIGGER\b|\bFUNCTION\b/i);
  });
});
