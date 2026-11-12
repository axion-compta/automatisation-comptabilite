import { describe, expect, it } from 'vitest';
import { verifierCatalogue } from '../../source.js';
import { CATALOGUE_PLAN_PCG as C } from '../plan-pcg.js';

describe('plan-pcg', () => {
  it('catalogue-chaque-ligne-sourcee', () => {
    expect(C).toHaveLength(2);
    expect(verifierCatalogue(C)).toEqual([]);
    for (const l of C) {
      expect(l.cle).toBe('pcg.version');
      expect(l.source_url.trim()).not.toBe('');
      expect(l.source_titre.trim()).not.toBe('');
      expect(l.statut).toBe('non_verifie');
      const v = JSON.parse(l.valeur) as { id: string; prefixesSupprimes: string[]; compteSubvention: string };
      expect(v.compteSubvention).toMatch(/^\d+$/);
    }
    const [ancienne, nouvelle] = C;
    expect(ancienne?.effet_fin).toBe(nouvelle?.effet_debut);
    expect(nouvelle?.effet_debut).toBe('2025-01-01');
    expect(nouvelle?.effet_fin).toBeNull();
    expect(JSON.parse(ancienne?.valeur ?? '{}').prefixesSupprimes).toEqual([]);
    expect(JSON.parse(nouvelle?.valeur ?? '{}').prefixesSupprimes).toEqual(['79']);
  });
});
