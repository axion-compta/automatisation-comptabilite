import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COUVERTURE } from './generateur.js';

const sql = readFileSync(new URL('../../base/migrations/092-securite.sql', import.meta.url), 'utf8').replace(/--[^\n]*/g, '');

describe('cas C01 à C25 @isolation', () => {
  it('chaque-cas-est-couvert-ou-renvoye-par-ecrit', () => {
    const attendus = Array.from({ length: 25 }, (_, i) => `C${String(i + 1).padStart(2, '0')}`);
    expect(Object.keys(COUVERTURE).sort()).toEqual(attendus);
    for (const v of Object.values(COUVERTURE)) expect(v).toMatch(/^(ici|L06-T35|renvoi.+)$/);
  });

  it('C03', () => {
    expect(sql).toMatch(/PRIMARY KEY \(societe_id, personne_id\)/);
    const cibles = [...sql.matchAll(/REFERENCES ([\w.]+) \(([^)]*)\)/g)];
    expect(cibles.length).toBeGreaterThanOrEqual(4);
    for (const m of cibles) expect(m[2], m[1]).toMatch(/^societe_id,/);
  });

  it('C22', () => {
    expect(sql).toMatch(/mode text NOT NULL CHECK \(mode IN \('reelle','demonstration'\)\)/);
    expect(sql).not.toMatch(/REFERENCES a_compta\.societe\b/);
    expect(sql).not.toMatch(/\b(societe_reelle|societe_demo\w*|reelle_id|demonstration_id)\b/);
  });
});
