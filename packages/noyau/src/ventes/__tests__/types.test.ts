import { describe, expect, it } from 'vitest';
import * as t from '../types.js';

const { ErreurVente, ajouterJours, comparerDates, estDans, estDateIso, exigerDate } = t;
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return (e as { code?: string }).code;
  }
  return undefined;
};

describe('types ventes', () => {
  it('listes-sans-doublon', () => {
    const listes = [t.TYPES_PIECE_VENTE, t.ORIGINES_VENTE, t.STATUTS_VENTE, t.NATURES_LIGNE, t.CODES_TVA_VENTE, t.NATURES_CLIENT, t.STATUTS_VIES, t.CAS_SCHEMA, t.ETATS_AFFICHES, t.ANOMALIES];
    for (const l of listes) {
      expect(l.length).toBeGreaterThan(0);
      expect(new Set(l).size).toBe(l.length);
    }
  });

  it('listes-figees', () => {
    expect([...t.TYPES_PIECE_VENTE]).toEqual(['facture', 'avoir', 'facture_acompte']);
    expect([...t.ORIGINES_VENTE]).toEqual(['depot', 'email', 'import_fichier', 'plateforme_agreee']);
    expect([...t.STATUTS_VENTE]).toEqual(['lue', 'a_verifier', 'proposee', 'validee', 'doublon', 'rejetee']);
    expect([...t.NATURES_LIGNE]).toEqual(['bien', 'service', 'a_confirmer']);
    expect([...t.CODES_TVA_VENTE]).toEqual(['COLLECTEE', 'FRANCHISE', 'EXONEREE_A_VERIFIER', 'AUTOLIQUIDATION_CLIENT', 'A_VERIFIER']);
    expect([...t.NATURES_CLIENT]).toEqual(['professionnel', 'particulier', 'a_confirmer']);
    expect([...t.STATUTS_VIES]).toEqual(['verifie', 'non_verifie', 'invalide']);
    expect([...t.CAS_SCHEMA]).toEqual(['A', 'B', 'C', 'D']);
    expect([...t.ETATS_AFFICHES]).toEqual(['a_relire', 'proposee', 'a_encaisser', 'payee_en_partie', 'en_retard', 'payee', 'en_litige', 'doublon']);
  });

  it('anomalies-a1-a-a20', () => {
    expect([...t.ANOMALIES]).toEqual(['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11', 'A12', 'A13', 'A14', 'A15', 'A16', 'A17', 'A18', 'A19', 'A20']);
  });

  it('erreur-vente-porte-son-code', () => {
    const e = new ErreurVente('date_invalide', 'message');
    expect(e).toBeInstanceOf(Error);
    expect([e.code, e.message, e.name]).toEqual(['date_invalide', 'message', 'ErreurVente']);
  });

  it('est-dans-refuse-inconnu', () => {
    expect(estDans(t.TYPES_PIECE_VENTE, 'avoir')).toBe(true);
    for (const v of ['', 'FACTURE', 'facture ', 42, undefined]) expect(estDans(t.TYPES_PIECE_VENTE, v)).toBe(false);
  });

  it('date-iso-stricte', () => {
    for (const v of ['2026-02-30', '2026-13-01', '2026-00-10', '2026-01-00', '2026-1-1', '', ' 2026-01-01', '2026-01-01 ', '2026-01-01\n', '2027-02-29', 20260101]) {
      expect(estDateIso(v)).toBe(false);
    }
    for (const v of ['2028-02-29', '2026-12-31', '0099-01-01', '0000-01-01', '9999-12-31']) expect(estDateIso(v)).toBe(true);
    expect(exigerDate('2026-05-04', 'x')).toBe('2026-05-04');
    expect(code(() => exigerDate('2026-02-30', 'echeance'))).toBe('date_invalide');
    expect(() => exigerDate('nope', 'echeance')).toThrow('echeance');
  });

  it('ajouter-jours-traverse-l-annee', () => {
    expect(ajouterJours('2026-12-31', 10)).toBe('2027-01-10');
    expect(ajouterJours('2027-01-01', -10)).toBe('2026-12-22');
    expect(ajouterJours('2026-01-05', -10)).toBe('2025-12-26');
    expect(ajouterJours('2028-02-28', 1)).toBe('2028-02-29');
    expect(ajouterJours('2026-02-28', 1)).toBe('2026-03-01');
    expect(ajouterJours('2026-06-15', 0)).toBe('2026-06-15');
    expect(ajouterJours('0099-12-31', 1)).toBe('0100-01-01');
    expect(ajouterJours('9999-12-31', 0)).toBe('9999-12-31');
    expect(ajouterJours('0000-01-01', 0)).toBe('0000-01-01');
    expect(code(() => ajouterJours('9999-12-31', 1))).toBe('decalage_invalide');
    expect(code(() => ajouterJours('0000-01-01', -1))).toBe('decalage_invalide');
    expect(code(() => ajouterJours('2026-02-30', 1))).toBe('date_invalide');
    expect(code(() => ajouterJours('', 1))).toBe('date_invalide');
  });

  it('decalage-invalide-refuse', () => {
    for (const n of [NaN, Infinity, -Infinity, 1.5, -0.5, 2 ** 53, 1e15, -1e15, 3000000, -800000]) {
      expect(code(() => ajouterJours('2026-01-01', n))).toBe('decalage_invalide');
    }
  });

  it('comparer-dates-dans-les-deux-sens', () => {
    expect(comparerDates('2026-01-01', '2026-01-02')).toBe(-1);
    expect(comparerDates('2026-01-02', '2026-01-01')).toBe(1);
    expect(comparerDates('2026-01-01', '2026-01-01')).toBe(0);
    expect(comparerDates('2025-12-31', '2026-01-01')).toBe(-1);
    expect(comparerDates('2027-01-01', '2026-12-31')).toBe(1);
    expect(code(() => comparerDates('2026-02-30', '2026-01-01'))).toBe('date_invalide');
    expect(code(() => comparerDates('2026-01-01', ''))).toBe('date_invalide');
  });
});
