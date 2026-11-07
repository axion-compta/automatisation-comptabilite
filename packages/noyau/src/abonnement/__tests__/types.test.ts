import { describe, expect, it } from 'vitest';
import {
  CLASSES_ACTION,
  ETATS_ACCES,
  ErreurAbonnement,
  ajouterJours,
  ecartJours,
  verifierDate,
  verifierEmpreinte,
  verifierEntier,
  verifierHorodatage,
} from '../types.js';

function code(f: () => unknown): string | undefined {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurAbonnement ? e.code : 'autre';
  }
  return undefined;
}

describe('types abonnement', () => {
  it('date-calendrier-reel', () => {
    expect(code(() => verifierDate('2026-02-29'))).toBe('date_invalide');
    expect(code(() => verifierDate('2028-02-29'))).toBeUndefined();
    expect(code(() => verifierDate('2026-13-01'))).toBe('date_invalide');
    expect(code(() => verifierDate('2026-04-31'))).toBe('date_invalide');
    expect(code(() => verifierDate('2026-00-10'))).toBe('date_invalide');
    expect(code(() => verifierDate('2026-01-00'))).toBe('date_invalide');
    expect(code(() => verifierDate('1900-02-29'))).toBe('date_invalide');
    expect(code(() => verifierDate('2000-02-29'))).toBeUndefined();
  });

  it('date-forme-refusee', () => {
    for (const d of ['', '2026-1-5', '2026-01-05T00:00Z', ' 2026-01-05', '2026-01-05\n']) {
      expect(code(() => verifierDate(d))).toBe('date_invalide');
    }
    expect(code(() => verifierDate(undefined as unknown as string))).toBe('date_invalide');
    expect(code(() => verifierDate(20260105 as unknown as string))).toBe('date_invalide');
  });

  it('horodatage-sans-z-refuse', () => {
    expect(code(() => verifierHorodatage('2026-03-01T10:00:00Z'))).toBeUndefined();
    expect(code(() => verifierHorodatage('2026-03-01T10:00:00.250Z'))).toBeUndefined();
    for (const h of [
      '',
      '2026-03-01T10:00:00',
      '2026-03-01T10:00:00+01:00',
      '2026-03-01 10:00:00Z',
      '2026-03-01T24:00:00Z',
      '2026-03-01T10:60:00Z',
      '2026-02-30T10:00:00Z',
      '2026-03-01',
    ]) {
      expect(code(() => verifierHorodatage(h))).toBe('horodatage_invalide');
    }
  });

  it('entier-nan-infinity-decimal-negatif-refuses', () => {
    for (const n of [Number.NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1, Number('1.5'), -1]) {
      expect(code(() => verifierEntier(n, 0))).toBe('entier_invalide');
    }
    expect(code(() => verifierEntier(0, 0))).toBeUndefined();
    expect(code(() => verifierEntier(7, 0))).toBeUndefined();
    expect(code(() => verifierEntier(0, 1))).toBe('entier_invalide');
    expect(code(() => verifierEntier('3' as unknown as number, 0))).toBe('entier_invalide');
  });

  it('ajouter-jours-passe-mois-et-annee', () => {
    expect(ajouterJours('2026-01-31', 1)).toBe('2026-02-01');
    expect(ajouterJours('2026-12-31', 1)).toBe('2027-01-01');
    expect(ajouterJours('2028-02-28', 1)).toBe('2028-02-29');
    expect(ajouterJours('2026-02-28', 1)).toBe('2026-03-01');
    expect(ajouterJours('2026-03-01', -1)).toBe('2026-02-28');
    expect(ajouterJours('2027-01-01', -1)).toBe('2026-12-31');
    expect(ajouterJours('2026-05-10', 0)).toBe('2026-05-10');
    expect(ajouterJours('2026-01-01', 365)).toBe('2027-01-01');
    expect(code(() => ajouterJours('2026-02-30', 1))).toBe('date_invalide');
    expect(code(() => ajouterJours('2026-02-01', Number.NaN))).toBe('entier_invalide');
    expect(code(() => ajouterJours('2026-02-01', Infinity))).toBe('entier_invalide');
    expect(code(() => ajouterJours('2026-02-01', 1.5))).toBe('entier_invalide');
  });

  it('ecart-jours-ordre-inverse-negatif', () => {
    expect(ecartJours('2026-01-01', '2026-01-31')).toBe(30);
    expect(ecartJours('2026-01-31', '2026-01-01')).toBe(-30);
    expect(ecartJours('2026-05-05', '2026-05-05')).toBe(0);
    expect(ecartJours('2026-12-31', '2027-01-01')).toBe(1);
    expect(ecartJours('2027-01-01', '2026-01-01')).toBe(-365);
    expect(ecartJours('2028-01-01', '2029-01-01')).toBe(366);
    expect(code(() => ecartJours('2026-02-30', '2026-03-01'))).toBe('date_invalide');
    expect(code(() => ecartJours('2026-03-01', 'x'))).toBe('date_invalide');
  });

  it('empreinte-majuscules-ou-courte-refusee', () => {
    const bonne = 'ab12'.repeat(16);
    expect(code(() => verifierEmpreinte(bonne))).toBeUndefined();
    expect(code(() => verifierEmpreinte(bonne.toUpperCase()))).toBe('empreinte_invalide');
    expect(code(() => verifierEmpreinte(bonne.slice(1)))).toBe('empreinte_invalide');
    expect(code(() => verifierEmpreinte(bonne + 'a'))).toBe('empreinte_invalide');
    expect(code(() => verifierEmpreinte('g'.repeat(64)))).toBe('empreinte_invalide');
    expect(code(() => verifierEmpreinte(''))).toBe('empreinte_invalide');
  });

  it('etats-et-classes-distincts', () => {
    expect(ETATS_ACCES).toHaveLength(6);
    expect(new Set(ETATS_ACCES).size).toBe(6);
    expect(CLASSES_ACTION).toHaveLength(5);
    expect(new Set(CLASSES_ACTION).size).toBe(5);
    expect([...ETATS_ACCES]).toEqual(['ESSAI', 'ACTIF', 'DELAI_DE_GRACE', 'LECTURE_SEULE', 'SUSPENDU', 'RESILIE']);
    expect([...CLASSES_ACTION]).toEqual(['lecture', 'export', 'ecriture', 'agent', 'compte']);
    const e = new ErreurAbonnement('palier_inconnu');
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe('palier_inconnu');
  });
});
