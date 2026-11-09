import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// L11-T37 : le test lit le texte du SQL et le passe à la garde des migrations. Aucune base n'est démarrée (J3a, règle 13).
type Probleme = { fichier: string; code: string };
const garde = (await import(new URL('../../../../../outils/gardes/migrations.mjs', import.meta.url).href)) as {
  analyserMigration: (texte: string, nom: string) => Probleme[];
  analyserNoms: (noms: string[]) => Probleme[];
};
const NOM = '011-frais.sql';
const sql = readFileSync(new URL(`../migrations/${NOM}`, import.meta.url), 'utf8');
const table = (n: string): string => new RegExp(`CREATE TABLE IF NOT EXISTS a_compta\\.${n} \\(([\\s\\S]*?)\\n\\);`).exec(sql)?.[1] ?? '';
const colonnes = (n: string): string[] => table(n).split('\n').map((l) => l.trim()).filter((l) => /^[a-z_]+ /.test(l) && !/^(CONSTRAINT|PRIMARY)/.test(l));
const colonne = (n: string, c: string): string => colonnes(n).find((l) => l.startsWith(`${c} `)) ?? '';

describe('migration 011-frais.sql', () => {
  it('migration-idempotente', () => {
    expect(garde.analyserMigration(sql, NOM)).toEqual([]);
    expect(garde.analyserNoms(['001-a.sql', NOM, '057-ia.sql'])).toEqual([]);
    for (const n of ['vehicule_personnel', 'remboursement', 'frais', 'trajet', 'cumul_km']) expect(table(n)).not.toBe('');
    expect([...sql.matchAll(/CREATE\s+(?:UNIQUE\s+)?(?:TABLE|INDEX|SCHEMA)\b[^\n]*/g)].length).toBeGreaterThanOrEqual(7);
    for (const m of sql.matchAll(/CREATE\s+(?:UNIQUE\s+)?(?:TABLE|INDEX|SCHEMA)\b[^\n]*/g)) expect(m[0]).toMatch(/IF NOT EXISTS/);
    expect(sql).not.toMatch(/DROP|DELETE|TRUNCATE|RENAME/i);
  });

  it('inv1-check-refuse-rembourse-paye-societe', () => {
    const c = /CONSTRAINT inv1_paye_societe CHECK \(([\s\S]*?)\n  \)/.exec(table('frais'))?.[1] ?? '';
    expect(c).toMatch(/payeur <> 'societe' OR/);
    expect(c).toMatch(/destination IS NULL/);
    expect(c).toMatch(/remboursement_id IS NULL/);
    expect(c).toMatch(/statut <> 'rembourse'/);
  });

  it('inv3-index-doublon-piece', () => {
    const i = /CREATE UNIQUE INDEX IF NOT EXISTS frais_piece_unique_non_refuse\s+ON a_compta\.frais \(piece_id\) WHERE ([^;]*);/.exec(sql)?.[1] ?? '';
    expect(i).toMatch(/piece_id IS NOT NULL/);
  });

  it('doublon-avec-refuse-accepte', () => {
    const i = /CREATE UNIQUE INDEX IF NOT EXISTS frais_piece_unique_non_refuse[^;]*;/.exec(sql)?.[0] ?? '';
    expect(i).toMatch(/statut <> 'refuse'/);
    expect(colonne('frais', 'statut')).toMatch(/'refuse'/);
  });

  it('montants-entiers-seulement', () => {
    for (const c of ['montant_ttc_centimes', 'tva_centimes', 'part_perso_ttc_centimes']) expect(colonne('frais', c)).toMatch(/ bigint NOT NULL CHECK \(\w+ >= 0\)/);
    expect(colonne('remboursement', 'montant_centimes')).toMatch(/ bigint NOT NULL CHECK/);
    expect(sql).not.toMatch(/\b(numeric|decimal|real|double precision|money|float)\b/i);
  });

  it('union-de-statut-fermee', () => {
    const statuts = ['brouillon', 'a_completer', 'propose', 'valide', 'rembourse', 'en_compte_courant', 'exclu_paye_societe', 'refuse', 'perso'];
    const l = colonne('frais', 'statut');
    expect(l).toMatch(/CHECK \(statut IN \(/);
    for (const s of statuts) expect(l).toContain(`'${s}'`);
    expect(l.match(/'[a-z_]+'/g)).toHaveLength(statuts.length);
    expect(colonne('frais', 'payeur')).toMatch(/CHECK \(payeur IN \('societe','personne','a_confirmer'\)\)/);
    expect(colonne('frais', 'nature')).toMatch(/CHECK \(nature IN \('depense','trajet'\)\)/);
    expect(colonne('vehicule_personnel', 'energie')).toMatch(/CHECK \(energie IN \(/);
    expect(colonne('vehicule_personnel', 'proprietaire')).toMatch(/CHECK \(proprietaire IN \(/);
  });

  it('km-negatifs-refuses', () => {
    expect(colonne('trajet', 'km_saisis_dixiemes')).toMatch(/ bigint NOT NULL CHECK \(km_saisis_dixiemes >= 0\)/);
    expect(colonne('cumul_km', 'km_dixiemes')).toMatch(/ bigint NOT NULL CHECK \(km_dixiemes >= 0\)/);
    expect(colonne('trajet', 'taux_applique')).toMatch(/ text/);
  });

  it('immatriculation-jamais-en-clair', () => {
    const noms = colonnes('vehicule_personnel').filter((l) => /immatricul/i.test(l));
    expect(noms).toHaveLength(1);
    expect(noms[0]).toMatch(/^immatriculation_chiffree bytea NOT NULL/);
    expect(sql).not.toMatch(/immatriculation\s+(text|varchar)/i);
  });
});
