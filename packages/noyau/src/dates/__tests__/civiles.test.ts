import { describe, expect, it } from 'vitest';
import {
  ErreurDate,
  ajouterAnnees,
  ajouterJours,
  ajouterMois,
  comparerDates,
  estDateValide,
  finDeMois,
  jourDeSemaine,
  moisCle,
} from '../civiles.js';

function code(action: () => unknown): string | undefined {
  try {
    action();
  } catch (e) {
    return e instanceof ErreurDate ? e.code : 'autre';
  }
  return undefined;
}

describe('dates civiles', () => {
  it('date-valide-et-invalide', () => {
    expect(['2026-01-01', '2026-12-31', '1000-01-01', '9999-12-31'].every(estDateValide)).toBe(true);
    const mauvaises = [
      '2026-02-30', '2026-02-29', '2026-13-01', '2026-00-10', '2026-01-00', '2026-04-31', '2026-1-1', '',
      ' ', '20260101', '2026-01-01 ', ' 2026-01-01', '2026-01-01\n', '0999-12-31', '0000-01-01', 'NaN',
      'Infinity', '2026-01-1.5', '2026/01/01',
    ];
    expect(mauvaises.some(estDateValide)).toBe(false);
    expect(estDateValide(undefined as never)).toBe(false);
    expect(code(() => finDeMois('2026-02-30'))).toBe('date_invalide');
    expect(code(() => ajouterJours('', 1))).toBe('date_invalide');
  });

  it('bissextile', () => {
    expect(estDateValide('2028-02-29')).toBe(true);
    expect(estDateValide('2000-02-29')).toBe(true);
    expect(estDateValide('1900-02-29')).toBe(false);
    expect(finDeMois('2028-02-10')).toBe('2028-02-29');
    expect(finDeMois('2026-02-10')).toBe('2026-02-28');
  });

  it('ajout-jours-traverse-l-annee', () => {
    expect(ajouterJours('2026-12-31', 1)).toBe('2027-01-01');
    expect(ajouterJours('2026-11-07', 0)).toBe('2026-11-07');
    expect(ajouterJours('2026-11-07', 100000)).toBe('2300-08-23');
  });

  it('ajout-mois-fin-de-mois', () => {
    expect(ajouterMois('2026-03-31', 6)).toBe('2026-09-30');
    expect(ajouterMois('2026-01-31', 1)).toBe('2026-02-28');
  });

  it('ajout-mois-fevrier', () => {
    expect(ajouterMois('2026-08-31', 6)).toBe('2027-02-28');
    expect(ajouterMois('2027-08-31', 6)).toBe('2028-02-29');
    expect(ajouterMois('2028-02-29', 12)).toBe('2029-02-28');
  });

  it('ajout-annees-29-fevrier', () => {
    expect(ajouterAnnees('2028-02-29', 1)).toBe('2029-02-28');
    expect(ajouterAnnees('2028-02-29', 4)).toBe('2032-02-29');
    expect(ajouterAnnees('2000-02-29', 100)).toBe('2100-02-28');
  });

  it('decalage-negatif', () => {
    expect(ajouterJours('2028-03-01', -1)).toBe('2028-02-29');
    expect(ajouterMois('2026-03-31', -1)).toBe('2026-02-28');
    expect(ajouterMois('2026-01-15', -1)).toBe('2025-12-15');
    expect(code(() => ajouterJours('1000-01-01', -1))).toBe('date_invalide');
    expect(code(() => ajouterJours('9999-12-31', 1))).toBe('date_invalide');
    expect(code(() => ajouterMois('9999-12-31', 1))).toBe('date_invalide');
    expect(code(() => ajouterAnnees('1000-01-01', -1))).toBe('date_invalide');
    expect(code(() => ajouterMois('2026-01-01', Number.MAX_SAFE_INTEGER))).toBe('date_invalide');
  });

  it('jour-de-semaine-connu', () => {
    expect(jourDeSemaine('2027-05-15')).toBe(6);
    expect(code(() => jourDeSemaine('2026-02-30'))).toBe('date_invalide');
  });

  it('decalage-invalide-refuse', () => {
    const invalides = [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number('1.5'), Number('-0.5'), 2 ** 53];
    for (const n of invalides) {
      expect(code(() => ajouterJours('2026-01-01', n))).toBe('decalage_invalide');
      expect(code(() => ajouterMois('2026-01-01', n))).toBe('decalage_invalide');
      expect(code(() => ajouterAnnees('2026-01-01', n))).toBe('decalage_invalide');
    }
    expect(code(() => ajouterJours('2026-01-01', '1' as never))).toBe('decalage_invalide');
  });

  it('comparaison-et-cle-de-mois', () => {
    expect(comparerDates('2026-01-01', '2026-01-02')).toBe(-1);
    expect(comparerDates('2026-01-01', '2026-01-01')).toBe(0);
    expect(code(() => comparerDates('2026-01-01', 'x'))).toBe('date_invalide');
    expect(moisCle('2026-03-31')).toBe('2026-03');
    expect(code(() => moisCle('2026-3-31'))).toBe('date_invalide');
  });
});
