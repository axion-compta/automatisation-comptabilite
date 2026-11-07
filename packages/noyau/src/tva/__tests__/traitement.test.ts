import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import { ErreurTva } from '../deductible.js';
import { effetTraitement, ErreurTraitementTva, type CodeTraitement, type EffetTraitement } from '../traitement.js';

const c = centimes;
const ZERO: EffetTraitement = { collectee: c(0), deductible: c(0), sousReserve: c(0), perdue: c(0), aVerifier: false };

function code(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    if (e instanceof ErreurTraitementTva) return e.code;
    throw e;
  }
  return undefined;
}

// Taux inventé (12,5 %), sans lien avec un taux réel.
const TAUX_INVENTE = 1250;

const base = { sens: 'achat' as const, base: c(10000), tvaLue: c(1700), franchise: false };

describe('effetTraitement', () => {
  it('deductible-part-totale', () => {
    expect(effetTraitement({ ...base, code: 'DEDUCTIBLE', partPointsDeBase: 10000 })).toEqual({ ...ZERO, deductible: 1700 });
    // Part omise : déductible en totalité.
    expect(effetTraitement({ ...base, code: 'DEDUCTIBLE' })).toEqual({ ...ZERO, deductible: 1700 });
  });

  it('deductible-part-partielle-perdue', () => {
    expect(effetTraitement({ ...base, code: 'DEDUCTIBLE', partPointsDeBase: 3333 })).toEqual({ ...ZERO, deductible: 567, perdue: 1133 });
    expect(effetTraitement({ ...base, code: 'DEDUCTIBLE', partPointsDeBase: 0 })).toEqual({ ...ZERO, perdue: 1700 });
    expect(() => effetTraitement({ ...base, code: 'DEDUCTIBLE', partPointsDeBase: 10001 })).toThrow(ErreurTva);
    expect(() => effetTraitement({ ...base, code: 'DEDUCTIBLE', partPointsDeBase: Number.NaN })).toThrow(ErreurTva);
  });

  it('vente deductible : collectée égale à la TVA lue', () => {
    expect(effetTraitement({ ...base, sens: 'vente', code: 'DEDUCTIBLE' })).toEqual({ ...ZERO, collectee: 1700 });
  });

  it('autoliquidation-net-nul', () => {
    for (const cd of ['AUTOLIQUIDATION', 'AUTOLIQUIDATION_FR'] as const) {
      const e = effetTraitement({ ...base, code: cd, tvaLue: c(0), tauxAutoliquidationPointsDeBase: TAUX_INVENTE });
      expect(e).toEqual({ ...ZERO, collectee: 1250, deductible: 1250 });
      expect(e.collectee - e.deductible).toBe(0);
    }
    // Arrondi demi supérieur sur la base.
    expect(effetTraitement({ ...base, code: 'AUTOLIQUIDATION', base: c(1020), tvaLue: c(0), tauxAutoliquidationPointsDeBase: TAUX_INVENTE }).collectee).toBe(128);
    expect(code(() => effetTraitement({ ...base, code: 'AUTOLIQUIDATION', tvaLue: c(0) }))).toBe('taux_manquant');
    expect(code(() => effetTraitement({ ...base, code: 'AUTOLIQUIDATION_FR', tvaLue: c(0) }))).toBe('taux_manquant');
    expect(code(() => effetTraitement({ ...base, code: 'AUTOLIQUIDATION', tauxAutoliquidationPointsDeBase: Number.NaN }))).toBe('montant_invalide');
    expect(code(() => effetTraitement({ ...base, code: 'AUTOLIQUIDATION', tauxAutoliquidationPointsDeBase: -1 }))).toBe('montant_invalide');
  });

  it('autoliquidation-en-franchise-due-non-deduite', () => {
    const e = effetTraitement({ ...base, code: 'AUTOLIQUIDATION', franchise: true, tvaLue: c(0), tauxAutoliquidationPointsDeBase: TAUX_INVENTE });
    expect(e).toEqual({ ...ZERO, collectee: 1250, perdue: 1250 });
  });

  it('autoliquidation avec TVA lue : à vérifier', () => {
    for (const cd of ['AUTOLIQUIDATION', 'AUTOLIQUIDATION_FR'] as const) {
      expect(effetTraitement({ ...base, code: cd, tauxAutoliquidationPointsDeBase: TAUX_INVENTE })).toEqual({ ...ZERO, aVerifier: true });
    }
  });

  it('sous-reserve-jamais-deductible', () => {
    const e = effetTraitement({ ...base, code: 'SOUS_RESERVE' });
    expect(e).toEqual({ ...ZERO, sousReserve: 1700 });
    expect(e.deductible).toBe(0);
  });

  it('non-deductible-perdue', () => {
    for (const cd of ['NON_DEDUCTIBLE_NOM', 'NON_DEDUCTIBLE_NATURE', 'NON_DEDUCTIBLE_ETRANGERE'] as const) {
      expect(effetTraitement({ ...base, code: cd })).toEqual({ ...ZERO, perdue: 1700 });
    }
  });

  it('a-verifier-bloque', () => {
    for (const cd of ['A_VERIFIER', 'MARGE'] as const) {
      expect(effetTraitement({ ...base, code: cd })).toEqual({ ...ZERO, aVerifier: true });
    }
    // Un code d'achat utilisé sur une vente est un doute : blocage.
    for (const cd of ['AUTOLIQUIDATION', 'SOUS_RESERVE', 'NON_DEDUCTIBLE_NOM'] as const) {
      expect(effetTraitement({ ...base, sens: 'vente', code: cd, tauxAutoliquidationPointsDeBase: TAUX_INVENTE })).toEqual({ ...ZERO, aVerifier: true });
    }
  });

  it('sans-tva-avec-tva-refuse', () => {
    expect(code(() => effetTraitement({ ...base, code: 'SANS_TVA' }))).toBe('tva_sur_sans_tva');
    expect(effetTraitement({ ...base, code: 'SANS_TVA', tvaLue: c(0) })).toEqual(ZERO);
    expect(effetTraitement({ ...base, sens: 'vente', code: 'SANS_TVA', tvaLue: c(0) })).toEqual(ZERO);
  });

  it('refuse les entrées invalides', () => {
    expect(code(() => effetTraitement({ ...base, code: 'INCONNU' as never }))).toBe('code_inconnu');
    expect(code(() => effetTraitement({ ...base, sens: 'autre' as never, code: 'DEDUCTIBLE' }))).toBe('code_inconnu');
    for (const v of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(code(() => effetTraitement({ ...base, code: 'DEDUCTIBLE', tvaLue: v as never }))).toBe('montant_invalide');
      expect(code(() => effetTraitement({ ...base, code: 'DEDUCTIBLE', base: v as never }))).toBe('montant_invalide');
    }
    expect(effetTraitement({ ...base, code: 'DEDUCTIBLE', base: c(0), tvaLue: c(0) })).toEqual(ZERO);
  });

  it('invariant-achats-mille-cas', () => {
    let graine = 987654321;
    const alea = (max: number): number => {
      graine = (Math.imul(graine, 1664525) + 1013904223) >>> 0;
      return graine % max;
    };
    // AUTOLIQUIDATION* exclus : leur TVA est calculée sur la base, non lue.
    const codes: CodeTraitement[] = [
      'DEDUCTIBLE',
      'SOUS_RESERVE',
      'NON_DEDUCTIBLE_NOM',
      'NON_DEDUCTIBLE_NATURE',
      'NON_DEDUCTIBLE_ETRANGERE',
      'A_VERIFIER',
      'MARGE',
      'SANS_TVA',
    ];
    for (let i = 0; i < 1000; i++) {
      const cd = codes[alea(codes.length)] as CodeTraitement;
      const tvaLue = cd === 'SANS_TVA' ? 0 : alea(100000);
      const e = effetTraitement({
        code: cd,
        sens: 'achat',
        base: c(alea(500000)),
        tvaLue: c(tvaLue),
        partPointsDeBase: alea(10001),
        franchise: alea(2) === 0,
      });
      if (cd === 'A_VERIFIER' || cd === 'MARGE') expect(e.aVerifier).toBe(true);
      else expect(e.deductible + e.sousReserve + e.perdue).toBe(tvaLue);
      expect(e.collectee).toBe(0);
      expect(Math.min(e.deductible, e.sousReserve, e.perdue)).toBeGreaterThanOrEqual(0);
      if (cd !== 'DEDUCTIBLE') expect(e.deductible).toBe(0);
    }
  });
});
