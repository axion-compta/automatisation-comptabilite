import { describe, expect, it } from 'vitest';
import {
  ANOMALIES,
  CAS_SCHEMA,
  CODES_TVA_VENTE,
  ETATS_AFFICHES,
  ErreurVente,
  NATURES_CLIENT,
  NATURES_LIGNE,
  ORIGINES_VENTE,
  STATUTS_VENTE,
  STATUTS_VIES,
  TYPES_PIECE_VENTE,
  ajouterJours,
  comparerDates,
  estDans,
  estDateIso,
  exigerDate,
} from '../types.js';

describe('types ventes', () => {
  it('listes-sans-doublon', () => {
    const listes = [
      TYPES_PIECE_VENTE,
      ORIGINES_VENTE,
      STATUTS_VENTE,
      NATURES_LIGNE,
      CODES_TVA_VENTE,
      NATURES_CLIENT,
      STATUTS_VIES,
      CAS_SCHEMA,
      ETATS_AFFICHES,
      ANOMALIES,
    ];
    for (const l of listes) {
      expect(l.length).toBeGreaterThan(0);
      expect(new Set(l).size).toBe(l.length);
    }
  });

  it('listes-figees', () => {
    expect([...TYPES_PIECE_VENTE]).toEqual(['facture', 'avoir', 'facture_acompte']);
    expect([...ORIGINES_VENTE]).toEqual(['depot', 'email', 'import_fichier', 'plateforme_agreee']);
    expect([...STATUTS_VENTE]).toEqual(['lue', 'a_verifier', 'proposee', 'validee', 'doublon', 'rejetee']);
    expect([...NATURES_LIGNE]).toEqual(['bien', 'service', 'a_confirmer']);
    expect([...CODES_TVA_VENTE]).toEqual([
      'COLLECTEE',
      'FRANCHISE',
      'EXONEREE_A_VERIFIER',
      'AUTOLIQUIDATION_CLIENT',
      'A_VERIFIER',
    ]);
    expect([...NATURES_CLIENT]).toEqual(['professionnel', 'particulier', 'a_confirmer']);
    expect([...STATUTS_VIES]).toEqual(['verifie', 'non_verifie', 'invalide']);
    expect([...CAS_SCHEMA]).toEqual(['A', 'B', 'C', 'D']);
    expect([...ETATS_AFFICHES]).toEqual([
      'a_relire',
      'proposee',
      'a_encaisser',
      'payee_en_partie',
      'en_retard',
      'payee',
      'en_litige',
      'doublon',
    ]);
  });

  it('anomalies-a1-a-a20', () => {
    expect([...ANOMALIES]).toEqual([
      'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10',
      'A11', 'A12', 'A13', 'A14', 'A15', 'A16', 'A17', 'A18', 'A19', 'A20',
    ]);
    expect(ANOMALIES).toHaveLength(20);
  });

  it('erreur-vente-porte-son-code', () => {
    const e = new ErreurVente('date_invalide', 'message');
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(ErreurVente);
    expect(e.code).toBe('date_invalide');
    expect(e.message).toBe('message');
    expect(e.name).toBe('ErreurVente');
  });

  it('est-dans-refuse-inconnu', () => {
    expect(estDans(TYPES_PIECE_VENTE, 'facture')).toBe(true);
    expect(estDans(TYPES_PIECE_VENTE, 'avoir')).toBe(true);
    expect(estDans(TYPES_PIECE_VENTE, '')).toBe(false);
    expect(estDans(TYPES_PIECE_VENTE, 'FACTURE')).toBe(false);
    expect(estDans(TYPES_PIECE_VENTE, 'facture ')).toBe(false);
    expect(estDans(TYPES_PIECE_VENTE, 42)).toBe(false);
    expect(estDans(TYPES_PIECE_VENTE, undefined)).toBe(false);
  });

  it('date-iso-stricte', () => {
    expect(estDateIso('2026-02-30')).toBe(false);
    expect(estDateIso('2026-13-01')).toBe(false);
    expect(estDateIso('2026-00-10')).toBe(false);
    expect(estDateIso('2026-01-00')).toBe(false);
    expect(estDateIso('2026-1-1')).toBe(false);
    expect(estDateIso('')).toBe(false);
    expect(estDateIso(' 2026-01-01')).toBe(false);
    expect(estDateIso('2026-01-01 ')).toBe(false);
    expect(estDateIso('2026-01-01\n')).toBe(false);
    expect(estDateIso('2027-02-29')).toBe(false);
    expect(estDateIso(20260101)).toBe(false);
    expect(estDateIso('2028-02-29')).toBe(true);
    expect(estDateIso('2026-12-31')).toBe(true);
    expect(estDateIso('0099-01-01')).toBe(true);
    expect(estDateIso('9999-12-31')).toBe(true);
    expect(estDateIso('0000-01-01')).toBe(true);
    expect(exigerDate('2026-05-04', 'x')).toBe('2026-05-04');
    expect(() => exigerDate('2026-02-30', 'echeance')).toThrow(ErreurVente);
    try {
      exigerDate('nope', 'echeance');
      expect.unreachable();
    } catch (e) {
      expect((e as ErreurVente).code).toBe('date_invalide');
      expect((e as ErreurVente).message).toContain('echeance');
    }
  });

  it('ajouter-jours-traverse-l-annee', () => {
    expect(ajouterJours('2026-12-31', 10)).toBe('2027-01-10');
    expect(ajouterJours('2027-01-01', -10)).toBe('2026-12-22');
    expect(ajouterJours('2026-01-05', -10)).toBe('2025-12-26');
    expect(ajouterJours('2026-12-25', 10)).toBe('2027-01-04');
    expect(ajouterJours('2028-02-28', 1)).toBe('2028-02-29');
    expect(ajouterJours('2026-02-28', 1)).toBe('2026-03-01');
    expect(ajouterJours('2026-06-15', 0)).toBe('2026-06-15');
    expect(ajouterJours('0099-12-31', 1)).toBe('0100-01-01');
    expect(() => ajouterJours('2026-02-30', 1)).toThrow(ErreurVente);
    expect(ajouterJours('9999-12-31', 0)).toBe('9999-12-31');
    expect(ajouterJours('0000-01-01', 0)).toBe('0000-01-01');
    expect(() => ajouterJours('9999-12-31', 1)).toThrow(ErreurVente);
    expect(() => ajouterJours('0000-01-01', -1)).toThrow(ErreurVente);
    expect(() => ajouterJours('', 1)).toThrow(ErreurVente);
  });

  it('decalage-invalide-refuse', () => {
    for (const n of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 1.5, -0.5, 2 ** 53]) {
      try {
        ajouterJours('2026-01-01', n);
        expect.unreachable();
      } catch (e) {
        expect(e).toBeInstanceOf(ErreurVente);
        expect((e as ErreurVente).code).toBe('decalage_invalide');
      }
    }
    for (const n of [1e15, -1e15, 3000000, -800000]) {
      expect(() => ajouterJours('2026-01-01', n)).toThrow(ErreurVente);
    }
  });

  it('comparer-dates-dans-les-deux-sens', () => {
    expect(comparerDates('2026-01-01', '2026-01-02')).toBe(-1);
    expect(comparerDates('2026-01-02', '2026-01-01')).toBe(1);
    expect(comparerDates('2026-01-01', '2026-01-01')).toBe(0);
    expect(comparerDates('2025-12-31', '2026-01-01')).toBe(-1);
    expect(comparerDates('2027-01-01', '2026-12-31')).toBe(1);
    expect(() => comparerDates('2026-02-30', '2026-01-01')).toThrow(ErreurVente);
    expect(() => comparerDates('2026-01-01', '')).toThrow(ErreurVente);
  });
});
