import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import { ErreurTva, ecartTva, partDeductible } from '../deductible.js';

const c = centimes;
const PART_INVENTEE = 6000;
const BASE_INVENTEE = 10000;
const POINTS_INVENTES = 1250;

describe('partDeductible', () => {
  it('part-totale', () => {
    expect(partDeductible(c(1234), 10000)).toEqual({ deductible: 1234, nonDeductible: 0 });
  });
  it('part-nulle', () => {
    expect(partDeductible(c(1234), 0)).toEqual({ deductible: 0, nonDeductible: 1234 });
  });
  it('part-arrondi-demi-superieur', () => {
    // 5 x 50 % = 2,5 centimes : demi vers le haut donne 3.
    expect(partDeductible(c(5), 5000)).toEqual({ deductible: 3, nonDeductible: 2 });
    expect(partDeductible(c(-5), 5000)).toEqual({ deductible: -3, nonDeductible: -2 });
  });
  it('somme-egale-tva-retenue', () => {
    let graine = 12345;
    const suivant = (): number => {
      graine = (graine * 1103515245 + 12345) % 2147483648;
      return graine;
    };
    for (let i = 0; i < 1000; i += 1) {
      const tva = c((suivant() % 2000001) - 1000000);
      const part = suivant() % 10001;
      const r = partDeductible(tva, part);
      expect(r.deductible + r.nonDeductible).toBe(tva);
    }
  });
  it('refuse une part hors de 0 à 10000', () => {
    for (const p of [-1, 10001, 1.5, NaN]) {
      expect(() => partDeductible(c(100), p)).toThrow(ErreurTva);
    }
    expect(() => partDeductible(c(100), 10001)).toThrow(expect.objectContaining({ code: 'part_invalide' }));
    expect(partDeductible(c(100), PART_INVENTEE).deductible).toBe(60);
  });
});

describe('ecartTva', () => {
  it('ecart-un-centime-sans-carte', () => {
    // attendue 1250 ; lue 1251 : écart 1 centime, pas de carte.
    const r = ecartTva({ base: c(BASE_INVENTEE), tauxPointsDeBase: POINTS_INVENTES, tvaLue: c(1251) });
    expect(r).toEqual({ tvaRetenue: 1251, tvaAttendue: 1250, ecart: 1, carte: false });
    expect(ecartTva({ base: c(BASE_INVENTEE), tauxPointsDeBase: POINTS_INVENTES, tvaLue: c(1249) }).carte).toBe(false);
  });
  it('ecart-deux-centimes-carte', () => {
    const r = ecartTva({ base: c(BASE_INVENTEE), tauxPointsDeBase: POINTS_INVENTES, tvaLue: c(1252) });
    expect(r).toEqual({ tvaRetenue: 1252, tvaAttendue: 1250, ecart: 2, carte: true });
    expect(ecartTva({ base: c(BASE_INVENTEE), tauxPointsDeBase: POINTS_INVENTES, tvaLue: c(1248) }).carte).toBe(true);
  });
});
