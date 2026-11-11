import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(new URL('../../migrations/0100_ventes.sql', import.meta.url), 'utf8');
const code = sql.replace(/--.*$/gm, '');
const TABLES = ['tiers_client', 'piece_vente', 'ligne_vente', 'serie_numerotation', 'encaissement_tva'];
const corps = (t: string) => new RegExp(`CREATE TABLE IF NOT EXISTS a_compta\\.${t} \\(([\\s\\S]*?)\\n\\);`).exec(code)?.[1] ?? '';

describe('migration des ventes (texte)', () => {
  it('migration-rejouable', () => {
    const ordres = code.replace(/\$\$[\s\S]*?\$\$/g, '').split(';').map((s) => s.trim()).filter((s) => s !== '');
    for (const o of ordres) {
      if (/^CREATE (TABLE|SCHEMA|INDEX)/.test(o)) expect(o).toContain('IF NOT EXISTS');
    }
    expect(code).not.toMatch(/\b(DROP|RENAME|TRUNCATE|DELETE)\b/i);
    expect(code).toContain('IF NOT EXISTS (SELECT FROM pg_policies');
    for (const t of TABLES) expect(corps(t)).not.toBe('');
  });

  it('cle-de-dedoublonnage-unique-par-societe', () => {
    expect(corps('piece_vente')).toMatch(/cle_dedoublonnage text NOT NULL/);
    expect(corps('piece_vente')).toContain('UNIQUE (societe_id, cle_dedoublonnage)');
    expect(corps('piece_vente')).not.toMatch(/cle_dedoublonnage text NOT NULL UNIQUE/);
  });

  it('montants-en-bigint', () => {
    const montants = TABLES.flatMap((t) => corps(t).split('\n').map((l) => l.trim())).filter((l) => /^\w*centimes /.test(l));
    expect(montants.length).toBe(7);
    for (const l of montants) {
      expect(l).toMatch(/ bigint NOT NULL CHECK \(\w+ >= 0\)/);
    }
    expect(code).not.toMatch(/\b(numeric|decimal|real|double precision|float|money)\b/i);
    expect(code).not.toMatch(/CHECK \(ht_centimes \+ tva_centimes/);
    expect(code).not.toMatch(/ht_centimes \+ tva_centimes\s*=/);
  });

  it('trous-et-doublons-en-tableau-entier', () => {
    expect(corps('serie_numerotation')).toContain("trous int[] NOT NULL DEFAULT '{}'");
    expect(corps('serie_numerotation')).toContain("doublons int[] NOT NULL DEFAULT '{}'");
  });

  it('autre-societe-invisible', () => {
    for (const t of TABLES) {
      const c = corps(t);
      expect(c).toContain('societe_id text NOT NULL');
      expect(c).toMatch(/PRIMARY KEY \(societe_id, /);
      expect(code).toContain(`ALTER TABLE a_compta.${t} ENABLE ROW LEVEL SECURITY`);
      for (const f of c.matchAll(/FOREIGN KEY \(([^)]*)\)/g)) expect(f[1]).toMatch(/^societe_id, /);
    }
    expect(code).toContain("USING (societe_id = current_setting(''a_compta.societe_id'', true))");
    expect(code).toContain("WITH CHECK (societe_id = current_setting(''a_compta.societe_id'', true))");
    for (const t of TABLES) expect(code).toContain(`'${t}'`);
  });

  it('aucune-adresse-ni-secret', () => {
    expect(code).not.toMatch(/https?:|@|password|secret|token|\b\d{1,3}(\.\d{1,3}){3}\b/i);
  });
});
