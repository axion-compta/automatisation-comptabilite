import { describe, expect, it } from 'vitest';
import { dateEcriture, dateRegularisation, type PeriodeFrais } from '../date-ecriture.js';
import { ErreurFrais } from '../types.js';

const p = (debut: string, fin: string, ouverte: boolean): PeriodeFrais => ({ debut, fin, ouverte });
const PERIODES = [
  p('2025-01-01', '2025-01-31', false),
  p('2025-02-01', '2025-02-28', true),
  p('2025-03-01', '2025-03-31', false),
  p('2025-04-01', '2025-04-30', true),
];

describe('dateEcriture', () => {
  it('periode-ouverte-date-du-frais', () => {
    expect(dateEcriture('2025-02-17', PERIODES)).toEqual({ date: '2025-02-17' });
    expect(dateEcriture('2025-02-01', PERIODES)).toEqual({ date: '2025-02-01' });
    expect(dateEcriture('2025-02-28', PERIODES)).toEqual({ date: '2025-02-28' });
  });

  it('periode-close-premier-jour-ouvert', () => {
    expect(dateEcriture('2025-01-15', PERIODES).date).toBe('2025-02-01');
    expect(dateEcriture('2025-03-31', PERIODES).date).toBe('2025-04-01');
  });

  it('motif-periode-close', () => {
    expect(dateEcriture('2025-03-10', PERIODES)).toEqual({ date: '2025-04-01', motif: 'periode_close' });
    expect('motif' in dateEcriture('2025-04-10', PERIODES)).toBe(false);
  });

  it('aucune-periode-ouverte-refuse', () => {
    expect(() => dateEcriture('2025-03-10', [p('2025-03-01', '2025-03-31', false)])).toThrow(ErreurFrais);
    expect(() => dateEcriture('2025-05-10', PERIODES)).toThrow(ErreurFrais);
    expect(() => dateEcriture('2025-03-10', [])).toThrow(ErreurFrais);
  });

  it('regularisation-31-decembre', () => {
    const an = [p('2025-12-01', '2025-12-31', true)];
    expect(dateRegularisation(2025, an)).toEqual({ date: '2025-12-31' });
  });

  it('regularisation-annee-close', () => {
    const an = [p('2025-12-01', '2025-12-31', false), p('2026-01-01', '2026-01-31', true)];
    expect(dateRegularisation(2025, an)).toEqual({ date: '2026-01-01', motif: 'periode_close' });
  });

  it('periodes-dans-le-desordre', () => {
    const desordre = [PERIODES[3]!, PERIODES[0]!, PERIODES[2]!, PERIODES[1]!];
    expect(dateEcriture('2025-03-10', desordre)).toEqual({ date: '2025-04-01', motif: 'periode_close' });
    expect(dateEcriture('2025-01-10', desordre).date).toBe('2025-02-01');
    expect(PERIODES[0]!.debut).toBe('2025-01-01');
  });

  it('entrees-invalides', () => {
    const code = (fn: () => unknown) => {
      try {
        fn();
      } catch (e) {
        return e instanceof ErreurFrais ? e.code : 'autre';
      }
      return 'aucun';
    };
    expect(code(() => dateEcriture('2025-02-30', PERIODES))).toBe('entree_invalide');
    expect(code(() => dateEcriture('', PERIODES))).toBe('entree_invalide');
    for (const a of [1.5, Number.NaN, Number.POSITIVE_INFINITY, 999, 10000]) {
      expect(code(() => dateRegularisation(a, PERIODES))).toBe('entree_invalide');
    }
    expect(code(() => dateRegularisation(1000, [p('1000-12-01', '1000-12-31', true)]))).toBe('aucun');
    expect(code(() => dateRegularisation(9999, [p('9999-12-01', '9999-12-31', true)]))).toBe('aucun');
    const chevauche = [p('2025-02-01', '2025-02-28', true), p('2025-02-28', '2025-03-31', true)];
    expect(code(() => dateEcriture('2025-02-10', chevauche))).toBe('entree_invalide');
    expect(code(() => dateEcriture('2025-02-10', [p('2025-02-28', '2025-02-01', true)]))).toBe('entree_invalide');
    expect(code(() => dateEcriture('2025-02-10', [p('2025-02-30', '2025-03-31', true)]))).toBe('entree_invalide');
  });
});
