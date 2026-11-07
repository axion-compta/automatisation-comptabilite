import { describe, expect, it } from 'vitest';
import { alr08, alr09, alr10, alr11, ErreurTiersBanque } from '../tiers-banque.js';

const JOUR = '2026-10-15';
const AVANT = 5;
const rc = (id: string, resteCentimes: number, echeance: string) => ({ id, sens: 'a_recevoir' as const, resteCentimes, echeance });
const ap = (id: string, resteCentimes: number, echeance: string) => ({ id, sens: 'a_payer' as const, resteCentimes, echeance });

describe('ALR-08 facture client en retard', () => {
  it('alr08-se-declenche', () => {
    expect(alr08([rc('f1', 1200, '2026-10-14')], JOUR)).toEqual([{ regle: 'ALR-08', objetType: 'facture', objetId: 'f1', gravite: 'a_faire', echeanceLe: '2026-10-14' }]);
  });
  it('alr08-jamais-urgent', () => {
    expect(alr08([rc('f1', 1200, '2023-01-19')], JOUR).map((c) => c.gravite)).toEqual(['a_faire']);
  });
  it('alr08-echeance-du-jour-rien', () => {
    expect(alr08([rc('f1', 1200, JOUR), rc('f2', 0, '2026-01-01'), rc('f3', 50, '2026-10-16')], JOUR)).toEqual([]);
  });
  it('alr08-entrees-invalides', () => {
    const mauvais = [-1, Number.NaN, Infinity, 1.5];
    for (const m of mauvais) expect(() => alr08([rc('f1', m, '2026-01-01')], JOUR)).toThrow(ErreurTiersBanque);
    expect(() => alr08([ap('f1', 10, '2026-01-01') as never], JOUR)).toThrow(ErreurTiersBanque);
    expect(() => alr08([rc('f1', 10, '2026-13-01')], JOUR)).toThrow();
  });
});

describe('ALR-09 facture à payer', () => {
  it('alr09-se-declenche', () => {
    const r = alr09([ap('f1', 900, '2026-10-17'), ap('f2', 900, '2026-10-01')], JOUR, { joursAvant: AVANT });
    expect(r).toEqual([
      { regle: 'ALR-09', objetType: 'facture', objetId: 'f1', gravite: 'urgent', echeanceLe: '2026-10-17' },
      { regle: 'ALR-09', objetType: 'facture', objetId: 'f2', gravite: 'urgent', echeanceLe: '2026-10-01' },
    ]);
  });
  it('alr09-ne-se-declenche-pas', () => {
    expect(alr09([ap('f1', 900, '2026-11-30'), ap('f2', 0, '2026-10-01')], JOUR, { joursAvant: AVANT })).toEqual([]);
  });
  it('alr09-seuil-exact', () => {
    expect(alr09([ap('f1', 900, '2026-10-20')], JOUR, { joursAvant: AVANT })).toHaveLength(1);
    expect(alr09([ap('f1', 900, '2026-10-21')], JOUR, { joursAvant: AVANT })).toEqual([]);
    expect(alr09([ap('f1', 900, JOUR)], JOUR, { joursAvant: 0 })).toHaveLength(1);
  });
  it('alr09-entrees-invalides', () => {
    for (const m of [-1, Number.NaN, Infinity, 1.5]) {
      expect(() => alr09([ap('f1', m, '2026-10-17')], JOUR, { joursAvant: AVANT })).toThrow(ErreurTiersBanque);
      expect(() => alr09([], JOUR, { joursAvant: m })).toThrow(ErreurTiersBanque);
    }
    expect(() => alr09([rc('f1', 10, '2026-10-17') as never], JOUR, { joursAvant: AVANT })).toThrow(ErreurTiersBanque);
  });
});

describe('ALR-10 écart de rapprochement', () => {
  it('alr10-ecart-a-faire', () => {
    expect(alr10([{ id: 'c1', ecart: 'ECART' }])).toEqual([{ regle: 'ALR-10', objetType: 'compte', objetId: 'c1', gravite: 'a_faire' }]);
  });
  it('alr10-impossible-urgent', () => {
    expect(alr10([{ id: 'c1', ecart: 'IMPOSSIBLE' }])).toEqual([{ regle: 'ALR-10', objetType: 'compte', objetId: 'c1', gravite: 'urgent' }]);
  });
  it('alr10-ok-rien', () => {
    expect(alr10([{ id: 'c1', ecart: 'OK' }])).toEqual([]);
    expect(() => alr10([{ id: 'c1', ecart: 'AUTRE' as never }])).toThrow(ErreurTiersBanque);
  });
});

describe('ALR-11 commentaire non lu', () => {
  it('alr11-cabinet-non-lu', () => {
    expect(alr11([{ id: 'm1', lu: false, auteur: 'cabinet' }])).toEqual([{ regle: 'ALR-11', objetType: 'commentaire', objetId: 'm1', gravite: 'a_faire' }]);
  });
  it('alr11-lu-rien', () => {
    expect(alr11([{ id: 'm1', lu: true, auteur: 'cabinet' }])).toEqual([]);
  });
  it('alr11-client-rien', () => {
    expect(alr11([{ id: 'm1', lu: false, auteur: 'client' }])).toEqual([]);
    expect(() => alr11([{ id: 'm1', lu: false, auteur: 'autre' as never }])).toThrow(ErreurTiersBanque);
  });
});
