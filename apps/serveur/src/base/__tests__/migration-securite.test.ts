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
const corpsDe = (texte: string, n: string): string =>
  new RegExp(`CREATE\\s+TABLE\\s+IF\\s+NOT\\s+EXISTS\\s+a_compta\\.${n}\\s*\\(([\\s\\S]*?)\\n\\s*\\)\\s*;`, 'i').exec(texte.replace(/--[^\n]*/g, ''))?.[1] ?? '';
const table = (n: string): string => corpsDe(sql, n);
const MOTS_CONTRAINTE = /^(CONSTRAINT|PRIMARY|FOREIGN|UNIQUE|CHECK)\b/i;
// Analyseur strict : tout élément est une contrainte reconnue ou une colonne reconnue, sinon erreur.
const analyser = (texte: string, n: string): { colonnes: string[]; contraintes: string[] } => {
  const corps = corpsDe(texte, n);
  if (corps === '') throw new Error(`table ${n} introuvable`);
  const morceaux: string[] = [];
  let profondeur = 0;
  let enGuillemets = false;
  let courant = '';
  for (const c of corps) {
    if (c === "'" || c === '"') enGuillemets = !enGuillemets;
    if (!enGuillemets && c === '(') profondeur++;
    if (!enGuillemets && c === ')') profondeur--;
    if (!enGuillemets && c === ',' && profondeur === 0) { morceaux.push(courant); courant = ''; } else courant += c;
  }
  morceaux.push(courant);
  const colonnes: string[] = [];
  const contraintes: string[] = [];
  for (const brut of morceaux) {
    const e = brut.replace(/\s+/g, ' ').trim();
    if (MOTS_CONTRAINTE.test(e)) { contraintes.push(e); continue; }
    const m = /^"?([A-Za-z_][A-Za-z0-9_]*)"?\s/.exec(e);
    if (m === null || e.startsWith('"') !== /^"[^"]*"\s/.test(e)) throw new Error(`élément non reconnu dans ${n} : « ${e} »`);
    colonnes.push(m[1] ?? '');
  }
  return { colonnes, contraintes };
};
const colonnes = (n: string): string[] => analyser(sql, n).colonnes;
const SECRET = /mot_?de_?passe|password|token|secret|(^|_)code($|_)/i;
const secretsDans = (texte: string, n: string): string[] => analyser(texte, n).colonnes.filter((c) => SECRET.test(c));
const ATTENDUES: Record<string, string[]> = {
  personne: ['societe_id', 'personne_id', 'mode', 'role', 'actif', 'cree_le'],
  acces_expert: ['societe_id', 'acces_id', 'personne_id', 'portee', 'debut', 'fin'],
  regle_permission: ['societe_id', 'role', 'action', 'ressource', 'autorise'],
  horloge_vue: ['societe_id', 'personne_id', 'vue', 'vu_le'],
  tete_journal: ['societe_id', 'rang', 'empreinte', 'empreinte_precedente', 'ecrit_le'],
  signalement: ['societe_id', 'signalement_id', 'personne_id', 'nature', 'etat', 'cree_le'],
  jeton_integration: ['societe_id', 'jeton_id', 'personne_id', 'nom', 'portee', 'reference_coffre', 'actif', 'cree_le'],
};

describe('092-securite.sql', () => {
  it('migrer-deux-fois-sans-changement', () => {
    expect(garde.analyserMigration(sql, NOM)).toEqual([]);
    expect(garde.analyserNoms(['091-autre.sql', NOM, '093-autre.sql'])).toEqual([]);
    expect(code).not.toMatch(/CREATE\s+(TABLE|INDEX|UNIQUE INDEX|SCHEMA)\s+(?!IF NOT EXISTS)/i);
    expect(code.match(/CREATE\s+TABLE/gi)).toHaveLength(TABLES.length);
    expect(code).not.toMatch(/ADD\s+COLUMN\s+(?!IF NOT EXISTS)/i);
  });

  it('aucun-champ-secret (T-CNX-7)', () => {
    for (const t of TABLES) {
      expect(colonnes(t), t).toEqual(ATTENDUES[t]);
      expect(secretsDans(sql, t), t).toEqual([]);
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

  describe('analyseur strict (colonne secrète cachée)', () => {
    const muter = (ajout: string): string => sql.replace(/(CREATE TABLE IF NOT EXISTS a_compta\.jeton_integration \()/, `$1\n  ${ajout}`);
    it('le texte réel est analysable et sans contrainte inconnue', () => {
      for (const t of TABLES) expect(() => analyser(sql, t), t).not.toThrow();
      expect(analyser(sql, 'jeton_integration').colonnes).toEqual(ATTENDUES.jeton_integration);
      expect(analyser(sql, 'personne').contraintes.length).toBeGreaterThanOrEqual(1);
    });
    it.each([
      ['L1 nom avec chiffre', 'token2 text,'],
      ['L2 identifiant entre guillemets', '"Token" text,'],
      ['L3 commentaire collé', '-- note\n  api_token text,'],
      ['majuscules', 'API_TOKEN text,'],
      ['tabulation', 'secret\ttext,'],
      ['multi-lignes', 'mot_de_passe\n    text\n    NOT NULL,'],
      ['deux colonnes sur une ligne', 'a text, password text,'],
    ])('rougit : %s', (_nom, ajout) => {
      const m = muter(ajout);
      expect(analyser(m, 'jeton_integration').colonnes).not.toEqual(ATTENDUES.jeton_integration);
    });
    it.each([
      ['élément illisible', '(token text),'],
      ['guillemet non fermé', '"Token text,'],
      ['élément numérique', '9x text,'],
    ])('lève une erreur : %s', (_nom, ajout) => {
      expect(() => analyser(muter(ajout), 'jeton_integration')).toThrow(/non reconnu/);
    });
  });
});
