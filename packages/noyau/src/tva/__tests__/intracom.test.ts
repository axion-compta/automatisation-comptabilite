import { describe, expect, it } from 'vitest';
import { centimes, type Centimes } from '../../argent/index.js';
import { lignesAutoliquidation, qualifierAcquisition } from '../intracom.js';
import type { EntreeAcquisition } from '../intracom.js';

const c = (n: number): Centimes => centimes(n);
const COMPTES = { collectee: '4457-test', deductible: '4456-test' };
const acq = (p: Partial<EntreeAcquisition> = {}): EntreeAcquisition => ({
  nature: 'bien',
  numeroTvaFournisseur: 'XX00000000000',
  base: c(100000),
  tauxPdb: 2000,
  ...p,
});

describe('acquisition intracommunautaire', () => {
  it('acquisition-bien-net-nul', () => {
    const q = qualifierAcquisition(acq({ nature: 'bien' }));
    expect(q).toEqual({ code: 'AUTOLIQUIDATION', collectee: c(20000), deductible: c(20000) });
    expect(q.collectee - q.deductible).toBe(0);
  });

  it('acquisition-service-net-nul', () => {
    const q = qualifierAcquisition(acq({ nature: 'service', base: c(33333), tauxPdb: 1000 }));
    expect(q).toEqual({ code: 'AUTOLIQUIDATION', collectee: c(3333), deductible: c(3333) });
    expect(q.collectee - q.deductible).toBe(0);
    expect(qualifierAcquisition(acq({ base: c(0) }))).toEqual({ code: 'AUTOLIQUIDATION', collectee: c(0), deductible: c(0) });
    expect(qualifierAcquisition(acq({ tauxPdb: 0 }))).toEqual({ code: 'AUTOLIQUIDATION', collectee: c(0), deductible: c(0) });
  });

  it('sans-numero-tva-a-verifier', () => {
    for (const numero of [undefined, '', '   ']) {
      for (const nature of ['bien', 'service'] as const) {
        expect(qualifierAcquisition(acq({ numeroTvaFournisseur: numero, nature }))).toEqual({
          code: 'A_VERIFIER',
          collectee: c(0),
          deductible: c(0),
        });
      }
    }
    expect(lignesAutoliquidation(qualifierAcquisition(acq({ numeroTvaFournisseur: undefined })), COMPTES)).toEqual([]);
  });

  it('lignes-equilibrees-comptes-en-argument', () => {
    const q = qualifierAcquisition(acq());
    const lignes = lignesAutoliquidation(q, COMPTES);
    expect(lignes).toEqual([
      { compte: '4456-test', debit: c(20000), credit: c(0) },
      { compte: '4457-test', debit: c(0), credit: c(20000) },
    ]);
    expect(lignes.reduce((t, l) => t + l.debit, 0)).toBe(lignes.reduce((t, l) => t + l.credit, 0));
    const autres = lignesAutoliquidation(q, { collectee: 'AAA', deductible: 'BBB' });
    expect(autres.map((l) => l.compte)).toEqual(['BBB', 'AAA']);
    expect(lignesAutoliquidation(qualifierAcquisition(acq({ base: c(0) })), COMPTES)).toEqual([]);
  });

  it('entrees-invalides-exception', () => {
    for (const base of [Number.NaN, -1, 1.5, Number.POSITIVE_INFINITY]) {
      expect(() => qualifierAcquisition(acq({ base: base as Centimes }))).toThrow();
      expect(() => qualifierAcquisition(acq({ base: base as Centimes, numeroTvaFournisseur: undefined }))).toThrow();
    }
    for (const t of [Number.NaN, -1, 1.5]) expect(() => qualifierAcquisition(acq({ tauxPdb: t }))).toThrow();
    expect(() => qualifierAcquisition(acq({ nature: 'autre' as 'bien' }))).toThrow(expect.objectContaining({ code: 'entree_invalide' }));
    const q = qualifierAcquisition(acq());
    expect(lignesAutoliquidation({ code: 'A_VERIFIER', collectee: c(100), deductible: c(100) }, COMPTES)).toEqual([]);
    for (const [col, ded] of [[0, 100], [100, 0], [100, 50], [Number.NaN, Number.NaN], [-5, -5], [1.5, 1.5]]) {
      const mal = { code: 'AUTOLIQUIDATION' as const, collectee: col as Centimes, deductible: ded as Centimes };
      expect(() => lignesAutoliquidation(mal, COMPTES)).toThrow(expect.objectContaining({ code: 'entree_invalide' }));
    }
    for (const comptes of [
      { collectee: '', deductible: 'B' },
      { collectee: 'A', deductible: '  ' },
      { collectee: 'A', deductible: 'A' },
    ]) {
      expect(() => lignesAutoliquidation(q, comptes)).toThrow(expect.objectContaining({ code: 'entree_invalide' }));
    }
  });
});
