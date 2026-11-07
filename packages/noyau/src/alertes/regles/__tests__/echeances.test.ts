import { describe, expect, it } from 'vitest';
import { alr01, alr03, alr04, ErreurRegle } from '../echeances.js';

const P = { joursAFaire: 6, joursUrgent: 2 };
const INVALIDES = [Number.NaN, -1, 1.5, Number.POSITIVE_INFINITY];
const e = (id: string, dateLimite?: string, faite = false) => ({ id, ...(dateLimite ? { dateLimite } : {}), faite });
const liasse = (id: string, dateLimite?: string, faite = false) => ({ ...e(id, dateLimite, faite), type: 'liasse' as const });
const gravites = (c: { gravite: string }[]) => c.map((x) => x.gravite);

describe('alertes échéances', () => {
  it('alr01-se-declenche', () => {
    const c = alr01([e('t1', '2026-03-20')], '2026-03-15', P);
    expect(c).toEqual([{ regle: 'ALR-01', objetType: 'echeance_tva', objetId: 't1', gravite: 'a_faire', echeanceLe: '2026-03-20' }]);
    expect(gravites(alr01([e('t1', '2026-03-20')], '2026-03-18', P))).toEqual(['urgent']);
    expect(gravites(alr01([e('t1', '2026-03-20')], '2026-03-25', P))).toEqual(['urgent']);
  });

  it('alr01-ne-se-declenche-pas', () => {
    expect(alr01([e('t1', '2026-03-20', true)], '2026-03-25', P)).toEqual([]);
    expect(alr01([e('t1')], '2026-03-25', P)).toEqual([]);
    expect(alr01([e('t1', '2026-03-20')], '2026-03-01', P)).toEqual([]);
    expect(alr01([], '2026-03-01', P)).toEqual([]);
  });

  it('alr01-seuil-exact', () => {
    expect(alr01([e('t1', '2026-03-20')], '2026-03-13', P)).toEqual([]);
    expect(gravites(alr01([e('t1', '2026-03-20')], '2026-03-14', P))).toEqual(['a_faire']);
    expect(gravites(alr01([e('t1', '2026-03-20')], '2026-03-17', P))).toEqual(['a_faire']);
    expect(gravites(alr01([e('t1', '2026-03-20')], '2026-03-18', P))).toEqual(['urgent']);
    expect(gravites(alr01([e('t1', '2026-03-20')], '2026-03-20', P))).toEqual(['urgent']);
  });

  it('alr01-parametres-invalides-refuses', () => {
    for (const v of INVALIDES) {
      expect(() => alr01([], '2026-03-01', { joursAFaire: v, joursUrgent: 2 })).toThrow(ErreurRegle);
      expect(() => alr01([], '2026-03-01', { joursAFaire: 6, joursUrgent: v })).toThrow(ErreurRegle);
      expect(() => alr04([], '2026-03-01', { joursAFaire: v, joursUrgent: 2 })).toThrow(ErreurRegle);
      expect(() => alr04([], '2026-03-01', { joursAFaire: 6, joursUrgent: v })).toThrow(ErreurRegle);
    }
  });

  const C = (id: string, d?: string, actif = true) => ({ id, actif, ...(d ? { dernierReleveCouvreJusquAu: d } : {}) });
  const R = { jourDuMois: 5, joursAvantTva: 7 };

  it('alr03-se-declenche', () => {
    expect(alr03([C('c1', '2026-02-27')], '2026-03-05', undefined, R)).toEqual([
      { regle: 'ALR-03', objetType: 'compte', objetId: 'c1', periode: '2026-02', gravite: 'a_faire' },
    ]);
    expect(gravites(alr03([C('c1')], '2026-03-05', undefined, R))).toEqual(['a_faire']);
    expect(gravites(alr03([C('c1')], '2026-03-05', '2026-03-12', R))).toEqual(['urgent']);
    expect(gravites(alr03([C('c1')], '2026-01-09', undefined, R))[0]).toBe('a_faire');
    expect(alr03([C('c1')], '2026-01-09', undefined, R)[0]?.periode).toBe('2025-12');
  });

  it('alr03-ne-se-declenche-pas', () => {
    expect(alr03([C('c1', '2026-02-28')], '2026-03-05', undefined, R)).toEqual([]);
    expect(alr03([C('c1', '2026-03-31')], '2026-03-20', undefined, R)).toEqual([]);
    expect(alr03([C('c1', undefined, false)], '2026-03-20', undefined, R)).toEqual([]);
    expect(alr03([C('c1')], '2026-03-04', undefined, R)).toEqual([]);
  });

  it('alr03-seuil-exact', () => {
    expect(alr03([C('c1')], '2026-03-04', undefined, R)).toEqual([]);
    expect(gravites(alr03([C('c1')], '2026-03-05', undefined, R))).toEqual(['a_faire']);
    expect(gravites(alr03([C('c1')], '2026-03-05', '2026-03-13', R))).toEqual(['a_faire']);
    expect(gravites(alr03([C('c1')], '2026-03-05', '2026-03-12', R))).toEqual(['urgent']);
    expect(gravites(alr03([C('c1')], '2026-03-05', '2026-03-05', R))).toEqual(['urgent']);
    expect(gravites(alr03([C('c1', '2026-02-27')], '2026-03-05', '2026-03-12', { jourDuMois: 5, joursAvantTva: 0 }))).toEqual(['a_faire']);
  });

  it('alr03-parametres-invalides-refuses', () => {
    for (const v of INVALIDES) {
      expect(() => alr03([], '2026-03-05', undefined, { jourDuMois: v, joursAvantTva: 7 })).toThrow(ErreurRegle);
      expect(() => alr03([], '2026-03-05', undefined, { jourDuMois: 5, joursAvantTva: v })).toThrow(ErreurRegle);
    }
    expect(() => alr03([], '2026-03-05', undefined, { jourDuMois: 0, joursAvantTva: 7 })).toThrow(ErreurRegle);
  });

  it('alr04-se-declenche', () => {
    const c = alr04([liasse('l1', '2026-05-15')], '2026-05-09', P);
    expect(c).toEqual([{ regle: 'ALR-04', objetType: 'echeance', objetId: 'l1', gravite: 'a_faire', echeanceLe: '2026-05-15' }]);
    for (const type of ['acompte_is', 'cfe', 'autre'] as const) {
      expect(gravites(alr04([{ ...liasse('x', '2026-05-15'), type }], '2026-05-13', P))).toEqual(['urgent']);
    }
    expect(gravites(alr04([liasse('l1', '2026-05-15')], '2026-06-01', P))).toEqual(['urgent']);
  });

  it('alr04-ne-se-declenche-pas', () => {
    expect(alr04([liasse('l1', '2026-05-15', true)], '2026-05-20', P)).toEqual([]);
    expect(alr04([liasse('l1')], '2026-05-20', P)).toEqual([]);
    expect(alr04([liasse('l1', '2026-05-15')], '2026-04-01', P)).toEqual([]);
  });

  it('alr04-seuil-exact', () => {
    expect(alr04([liasse('l1', '2026-05-15')], '2026-05-08', P)).toEqual([]);
    expect(gravites(alr04([liasse('l1', '2026-05-15')], '2026-05-09', P))).toEqual(['a_faire']);
    expect(gravites(alr04([liasse('l1', '2026-05-15')], '2026-05-12', P))).toEqual(['a_faire']);
    expect(gravites(alr04([liasse('l1', '2026-05-15')], '2026-05-13', P))).toEqual(['urgent']);
    expect(gravites(alr04([liasse('l1', '2026-05-15')], '2026-05-15', P))).toEqual(['urgent']);
  });
});
