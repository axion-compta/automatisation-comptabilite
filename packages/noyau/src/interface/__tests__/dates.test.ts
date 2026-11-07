import { describe, expect, it } from 'vitest';
import { ErreurDate, ajouterJours, comparerDates, dateValide, joursEntre } from '../dates.js';

function codeErreur(f: () => unknown): string | undefined {
  try {
    f();
  } catch (e) {
    if (e instanceof ErreurDate) return e.code;
    throw e;
  }
  return undefined;
}

describe('dates civiles du lot 15', () => {
  it('date-valide-bissextile', () => {
    expect(dateValide('1900-02-29')).toBe(false);
    expect(dateValide('2000-02-29')).toBe(true);
    expect(dateValide('2024-02-29')).toBe(true);
    expect(dateValide('2026-02-29')).toBe(false);
    expect(dateValide('2026-02-28')).toBe(true);
    // Fins de mois et bornes d'année.
    expect(dateValide('2026-01-31')).toBe(true);
    expect(dateValide('2026-04-30')).toBe(true);
    expect(dateValide('2026-12-31')).toBe(true);
    expect(dateValide('1000-01-01')).toBe(true);
    expect(dateValide('9999-12-31')).toBe(true);
    expect(dateValide('2026-01-00')).toBe(false);
    expect(dateValide('2026-00-10')).toBe(false);
  });

  it('date-invalide-formes', () => {
    for (const s of ['', '2026-2-1', '2026-13-01', '0999-01-01', ' 2026-01-01', '2026-04-31', '2026-01-01 ', '2026-01-011', '20260101', '2026/01/01', '２０２６-01-01']) {
      expect(dateValide(s)).toBe(false);
    }
    expect(dateValide(undefined as unknown as string)).toBe(false);
    expect(dateValide(20260101 as unknown as string)).toBe(false);
    expect(dateValide('2026-01-01\n')).toBe(false);
  });

  it('jours-entre-meme-date-zero', () => {
    expect(joursEntre('2026-05-17', '2026-05-17')).toBe(0);
    expect(joursEntre('1000-01-01', '1000-01-01')).toBe(0);
  });

  it('jours-entre-ordre-inverse-negatif', () => {
    expect(joursEntre('2026-01-01', '2026-01-02')).toBe(1);
    expect(joursEntre('2026-01-02', '2026-01-01')).toBe(-1);
    expect(joursEntre('2026-03-01', '2026-02-01')).toBe(-28);
    expect(joursEntre('2027-01-01', '2026-01-01')).toBe(-365);
  });

  it('jours-entre-traverse-annee-bissextile', () => {
    expect(joursEntre('2024-02-28', '2024-03-01')).toBe(2);
    expect(joursEntre('2026-02-28', '2026-03-01')).toBe(1);
    expect(joursEntre('2024-01-01', '2025-01-01')).toBe(366);
    expect(joursEntre('2026-01-01', '2027-01-01')).toBe(365);
    expect(joursEntre('1900-01-01', '1901-01-01')).toBe(365);
    expect(joursEntre('2000-01-01', '2001-01-01')).toBe(366);
    expect(joursEntre('2026-12-31', '2027-01-01')).toBe(1);
    expect(joursEntre('2026-01-31', '2026-02-01')).toBe(1);
    expect(joursEntre('2026-04-30', '2026-05-01')).toBe(1);
    expect(joursEntre('2020-01-01', '2030-01-01')).toBe(3653);
    expect(joursEntre('1000-01-01', '9999-12-31')).toBe(joursEntre('9999-12-31', '1000-01-01') * -1);
  });

  it('ajouter-jours-aller-retour', () => {
    const departs: string[] = [];
    let d = '2023-11-15';
    for (let i = 0; i < 400; i += 1) {
      departs.push(d);
      d = ajouterJours(d, 3);
    }
    expect(departs).toHaveLength(400);
    for (const depart of departs) {
      for (let n = -800; n <= 800; n += 37) {
        const avance = ajouterJours(depart, n);
        expect(dateValide(avance)).toBe(true);
        expect(joursEntre(depart, avance)).toBe(n);
        expect(ajouterJours(avance, -n)).toBe(depart);
      }
    }
    expect(ajouterJours('2026-02-28', 1)).toBe('2026-03-01');
    expect(ajouterJours('2024-02-28', 1)).toBe('2024-02-29');
    expect(ajouterJours('2024-02-29', 1)).toBe('2024-03-01');
    expect(ajouterJours('2026-12-31', 1)).toBe('2027-01-01');
    expect(ajouterJours('2027-01-01', -1)).toBe('2026-12-31');
    expect(ajouterJours('2026-01-31', 1)).toBe('2026-02-01');
    expect(ajouterJours('2026-04-30', 1)).toBe('2026-05-01');
    expect(ajouterJours('2026-05-17', 0)).toBe('2026-05-17');
    expect(ajouterJours('2026-01-01', 365)).toBe('2027-01-01');
    expect(ajouterJours('2024-01-01', 366)).toBe('2025-01-01');
    expect(ajouterJours('2026-05-17', 15)).toBe('2026-06-01');
  });

  it('ajouter-jours-nombre-invalide', () => {
    for (const n of [0.5, Number.NaN, Infinity, -Infinity, 2 ** 60]) {
      expect(codeErreur(() => ajouterJours('2026-01-01', n))).toBe('nombre_invalide');
    }
    expect(codeErreur(() => ajouterJours('2026-01-01', '3' as unknown as number))).toBe('nombre_invalide');
    expect(codeErreur(() => ajouterJours('2026-02-30', 1))).toBe('date_invalide');
    expect(codeErreur(() => ajouterJours('', 1))).toBe('date_invalide');
    expect(codeErreur(() => ajouterJours('9999-12-31', 1))).toBe('date_invalide');
    expect(codeErreur(() => ajouterJours('1000-01-01', -1))).toBe('date_invalide');
    expect(codeErreur(() => joursEntre('2026-13-01', '2026-01-01'))).toBe('date_invalide');
    expect(codeErreur(() => joursEntre('2026-01-01', 'x'))).toBe('date_invalide');
    expect(codeErreur(() => comparerDates('x', '2026-01-01'))).toBe('date_invalide');
    expect(new ErreurDate('nombre_invalide')).toBeInstanceOf(Error);
    expect(new ErreurDate('nombre_invalide').code).toBe('nombre_invalide');
  });

  it('comparer-dates-trois-cas', () => {
    expect(comparerDates('2026-01-01', '2026-01-02')).toBe(-1);
    expect(comparerDates('2026-01-02', '2026-01-01')).toBe(1);
    expect(comparerDates('2026-01-01', '2026-01-01')).toBe(0);
    expect(comparerDates('2025-12-31', '2026-01-01')).toBe(-1);
    expect(comparerDates('2026-02-01', '2026-01-31')).toBe(1);
  });
});
