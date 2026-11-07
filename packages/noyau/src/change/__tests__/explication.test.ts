import { describe, expect, it } from 'vitest';
import { ErreurExplication, detailSecondNiveau, expliquerEcart } from '../explication.js';

const PIECE = { tauxE8: 92000000, source: 'Taux de test (source fictive)', date: '2026-10-07' };
const PAIEMENT = { tauxE8: 95000000, source: 'Taux de test (source fictive)', date: '2026-11-20' };
const COMPTES = { perte: '656000', gain: '756000' };

const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurExplication ? e.code : 'autre';
  }
  return undefined;
};

const valeurs = (o: unknown): unknown[] =>
  typeof o === 'object' && o !== null ? Object.values(o).flatMap(valeurs) : [o];

describe('expliquerEcart', () => {
  it('perte-de-18-euros', () => {
    const r = expliquerEcart({ montant: 1800, devise: 'USD' }, PIECE, PAIEMENT);
    expect(r).toEqual({ sens: 'perte', montant: 1800, devise: 'USD', taux: [PIECE, PAIEMENT] });
  });

  it('gain', () => {
    const r = expliquerEcart({ montant: -1800, devise: 'USD' }, PIECE, PAIEMENT);
    expect(r.sens).toBe('gain');
    expect(r.montant).toBe(1800);
  });

  it('ecart-nul-aucun', () => {
    const r = expliquerEcart({ montant: 0, devise: 'USD' }, PIECE, PAIEMENT);
    expect(r.sens).toBe('aucun');
    expect(r.montant).toBe(0);
    expect(Object.is(r.montant, -0)).toBe(false);
  });

  it('source-absente-refusee', () => {
    const ecart = { montant: 1800, devise: 'USD' };
    for (const mauvais of [{ ...PIECE, source: '' }, { ...PIECE, source: '   ' }, { ...PIECE, date: '' }]) {
      expect(code(() => expliquerEcart(ecart, mauvais, PAIEMENT))).toBe('source_absente');
      expect(code(() => expliquerEcart(ecart, PIECE, mauvais))).toBe('source_absente');
    }
    expect(code(() => expliquerEcart(ecart, { tauxE8: 1 } as never, PAIEMENT))).toBe('source_absente');
  });

  it('compte-absent-du-premier-niveau', () => {
    for (const montant of [1800, -1800, 0]) {
      const r = expliquerEcart({ montant, devise: 'USD' }, PIECE, PAIEMENT);
      const v = valeurs(r);
      expect(v).not.toContain('656000');
      expect(v).not.toContain('756000');
      expect(Object.keys(r).sort()).toEqual(['devise', 'montant', 'sens', 'taux']);
    }
  });

  it('second-niveau-donne-le-compte', () => {
    const perte = expliquerEcart({ montant: 1800, devise: 'USD' }, PIECE, PAIEMENT);
    const gain = expliquerEcart({ montant: -5, devise: 'USD' }, PIECE, PAIEMENT);
    const nul = expliquerEcart({ montant: 0, devise: 'USD' }, PIECE, PAIEMENT);
    expect(detailSecondNiveau(perte, COMPTES)).toEqual({ compte: '656000' });
    expect(detailSecondNiveau(gain, COMPTES)).toEqual({ compte: '756000' });
    expect(detailSecondNiveau(nul, COMPTES)).toEqual({});
  });

  it('entrees-invalides', () => {
    for (const v of [Number.NaN, 1.5, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(code(() => expliquerEcart({ montant: v, devise: 'USD' }, PIECE, PAIEMENT))).toBe('entree_invalide');
    }
    for (const t of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(code(() => expliquerEcart({ montant: 1, devise: 'USD' }, { ...PIECE, tauxE8: t }, PAIEMENT))).toBe(
        'entree_invalide',
      );
      expect(code(() => expliquerEcart({ montant: 1, devise: 'USD' }, PIECE, { ...PAIEMENT, tauxE8: t }))).toBe(
        'entree_invalide',
      );
    }
  });

  it('entree-pure-sans-effet', () => {
    const ecart = Object.freeze({ montant: 100, devise: 'USD' });
    const p = Object.freeze({ ...PIECE });
    expect(() => expliquerEcart(ecart, p, Object.freeze({ ...PAIEMENT }))).not.toThrow();
    expect(
      code(() => detailSecondNiveau(expliquerEcart(ecart, p, PAIEMENT), { perte: '', gain: '756000' })),
    ).toBe('entree_invalide');
  });
});
