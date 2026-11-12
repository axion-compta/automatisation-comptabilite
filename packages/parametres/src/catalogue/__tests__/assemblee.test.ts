import { describe, expect, it } from 'vitest';
import { REGLES_ASSEMBLEE } from '../assemblee.js';

const ARTICLE = /\b(art\.|article)\s*(L?\d+)/i;

describe("catalogue de l'organe d'approbation", () => {
  it('regle-datee-et-sourcee', () => {
    for (const g of REGLES_ASSEMBLEE) {
      expect(g.valableAPartir).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(g.source).toMatch(ARTICLE);
      expect(g.statut).toBe('a_verifier');
    }
    const cles = REGLES_ASSEMBLEE.map((g) => `${g.forme}/${g.cas}`);
    expect(new Set(cles).size).toBe(cles.length);
    for (const f of ['EI', 'EURL', 'SASU', 'SARL', 'SAS', 'SCI']) expect(cles.some((c) => c.startsWith(`${f}/`))).toBe(true);
    expect(REGLES_ASSEMBLEE.filter((g) => g.depotVautApprobation).map((g) => `${g.forme}/${g.cas}`)).toEqual(['EURL/associe_unique_dirigeant', 'SASU/associe_unique_dirigeant']);
    expect(REGLES_ASSEMBLEE.find((g) => g.forme === 'SCI' && g.cas === 'sans_ag')?.modes).toEqual(['rapport_gerant']);
  });
});
