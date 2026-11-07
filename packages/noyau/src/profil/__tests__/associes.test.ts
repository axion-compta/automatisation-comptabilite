import { describe, expect, it } from 'vitest';
import { detentionAuMoins, partPersonnesPhysiquesPdb, verifierRepartition, type Associe } from '../associes.js';
import { ErreurProfil } from '../types.js';

const A = (id: string, partPdb: number, nature: Associe['nature'] = 'physique'): Associe => ({
  id, nature, roles: ['associe'], partPdb,
});
function code(f: () => unknown): string | undefined {
  try { f(); } catch (e) { return e instanceof ErreurProfil ? e.code : 'autre'; }
  return undefined;
}
const BON = [A('a', 6000), A('b', 4000, 'morale')];

describe('associés', () => {
  it('cent-pour-cent-valide', () => {
    expect(verifierRepartition(BON)).toEqual({ valide: true, sommePdb: 10000 });
    expect(verifierRepartition([A('a', 10000)]).valide).toBe(true);
    expect(verifierRepartition([A('a', 10000), A('b', 0)]).valide).toBe(true);
  });
  it('quatre-vingt-dix-neuf-quatre-vingt-dix-neuf-refuse', () => {
    expect(verifierRepartition([A('a', 6000), A('b', 3999)])).toEqual({ valide: false, sommePdb: 9999, motif: 'somme_differente' });
  });
  it('plus-de-cent-refuse', () => {
    expect(verifierRepartition([A('a', 6000), A('b', 4001)])).toEqual({ valide: false, sommePdb: 10001, motif: 'somme_differente' });
  });
  it('part-invalide', () => {
    for (const p of [Number.NaN, Number.POSITIVE_INFINITY, -1, 12.5, '50' as unknown as number, Number.MAX_SAFE_INTEGER + 1]) {
      expect(verifierRepartition([A('a', p), A('b', 5000)]).motif).toBe('part_invalide');
    }
    expect(verifierRepartition([A('a', Number.MAX_SAFE_INTEGER), A('b', 5)]).motif).toBe('part_invalide');
  });
  it('aucun-associe', () => {
    expect(verifierRepartition([])).toEqual({ valide: false, sommePdb: 0, motif: 'aucun_associe' });
    expect(code(() => partPersonnesPhysiquesPdb([]))).toBe('repartition_invalide');
  });
  it('associe-en-double', () => {
    expect(verifierRepartition([A('a', 5000), A('a', 5000)])).toEqual({ valide: false, sommePdb: 10000, motif: 'associe_en_double' });
  });
  it('part-physiques', () => {
    expect(partPersonnesPhysiquesPdb(BON)).toBe(6000);
    expect(partPersonnesPhysiquesPdb([A('a', 10000, 'morale')])).toBe(0);
    expect(partPersonnesPhysiquesPdb([A('a', 2500), A('b', 2500), A('c', 5000, 'morale')])).toBe(5000);
    expect(code(() => partPersonnesPhysiquesPdb([A('a', 6000)]))).toBe('repartition_invalide');
  });
  it('detention-au-seuil', () => {
    expect(detentionAuMoins(BON, 6000)).toBe(true);
    expect(detentionAuMoins(BON, 6001)).toBe(false);
    expect(detentionAuMoins(BON, 0)).toBe(true);
    for (const s of [-1, 10001, Number.NaN, 1.5, Number.POSITIVE_INFINITY]) {
      expect(code(() => detentionAuMoins(BON, s))).toBe('seuil_invalide');
    }
    expect(code(() => detentionAuMoins([A('a', 1)], 0))).toBe('repartition_invalide');
  });
});
