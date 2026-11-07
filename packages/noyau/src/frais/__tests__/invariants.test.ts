import { describe, expect, it } from 'vitest';
import { centimes, type Centimes } from '../../argent/index.js';
import { doublonsDePiece, refuserDoublon, verifierInvariants, violations } from '../invariants.js';
import type { Frais, StatutFrais } from '../types.js';

const f = (o: Partial<Frais> = {}): Frais => ({
  id: 'f1',
  personneId: 'p1',
  nature: 'depense',
  dateDepense: '2026-03-02',
  libelle: 'Repas fictif',
  montantTtc: centimes(1200),
  tva: centimes(0),
  payeur: 'personne',
  statut: 'valide',
  justificatifPerdu: false,
  partPersoTtc: centimes(0),
  version: 1,
  ...o,
});
const code = (fn: () => unknown): string | undefined => {
  try {
    fn();
  } catch (e) {
    return (e as { code?: string }).code;
  }
  return undefined;
};
const AU_DELA: StatutFrais[] = ['propose', 'valide', 'rembourse', 'en_compte_courant'];
const AUTRES: StatutFrais[] = ['brouillon', 'a_completer', 'refuse', 'perso', 'exclu_paye_societe'];

describe('invariants frais', () => {
  it('paye-societe-jamais-rembourse', () => {
    const s = (o: Partial<Frais>) => violations(f({ payeur: 'societe', statut: 'exclu_paye_societe', ...o }));
    expect(s({ statut: 'rembourse' })).toEqual(['inv1_paye_societe_rembourse']);
    expect(s({ remboursementId: 'r1' })).toEqual(['inv1_paye_societe_rembourse']);
    expect(s({ destination: 'remboursement' })).toEqual(['inv1_paye_societe_rembourse']);
    expect(s({ destination: 'compte_courant' })).toEqual(['inv1_paye_societe_rembourse']);
    expect(s({ remboursementId: '' })).toEqual(['inv1_paye_societe_rembourse']);
    expect(code(() => verifierInvariants(f({ payeur: 'societe', remboursementId: 'r1' })))).toBe('entree_invalide');
    expect(violations(f({ payeur: 'personne', statut: 'rembourse', remboursementId: 'r1', destination: 'remboursement' }))).toEqual([]);
  });

  it('paye-societe-propre-sans-violation', () => {
    for (const statut of ['brouillon', 'a_completer', 'exclu_paye_societe', 'refuse', 'perso', 'valide'] as StatutFrais[]) {
      expect(violations(f({ payeur: 'societe', statut }))).toEqual([]);
    }
    expect(() => verifierInvariants(f({ payeur: 'societe', statut: 'exclu_paye_societe' }))).not.toThrow();
  });

  it('payeur-suppose-au-plus-a-completer', () => {
    for (const statut of AU_DELA) {
      expect(violations(f({ payeur: 'a_confirmer', statut }))).toEqual(['inv2_payeur_suppose_avance']);
      expect(violations(f({ payeur: 'personne', statut }))).toEqual([]);
    }
    for (const statut of AUTRES) expect(violations(f({ payeur: 'a_confirmer', statut }))).toEqual([]);
    expect(code(() => verifierInvariants(f({ payeur: 'a_confirmer', statut: 'propose' })))).toBe('entree_invalide');
  });

  it('doublon-meme-piece-refuse', () => {
    const l = [f({ id: 'b', pieceId: 'z' }), f({ id: 'a', pieceId: 'z' }), f({ id: 'c', pieceId: 'y' }), f({ id: 'd', pieceId: 'y' }), f({ id: 'e', pieceId: 'y' }), f({ id: 'u', pieceId: 'x' })];
    const attendu = [
      { pieceId: 'y', fraisIds: ['c', 'd', 'e'] },
      { pieceId: 'z', fraisIds: ['a', 'b'] },
    ];
    expect(doublonsDePiece(l)).toEqual(attendu);
    expect(doublonsDePiece([...l].reverse())).toEqual(attendu);
    expect(code(() => refuserDoublon(l, f({ id: 'n', pieceId: 'x' })))).toBe('doublon_piece');
    expect(code(() => refuserDoublon(l, f({ id: 'u', pieceId: 'x' })))).toBeUndefined();
    expect(code(() => refuserDoublon(l, f({ id: 'n', pieceId: 'w' })))).toBeUndefined();
  });

  it('doublon-avec-frais-refuse-accepte', () => {
    const l = [f({ id: 'a', pieceId: 'z', statut: 'refuse' }), f({ id: 'b', pieceId: 'z' }), f({ id: 'c', pieceId: 'y', statut: 'refuse' }), f({ id: 'd', pieceId: 'y', statut: 'refuse' })];
    expect(doublonsDePiece(l)).toEqual([]);
    expect(() => refuserDoublon([l[0]!, l[2]!], f({ id: 'n', pieceId: 'z' }))).not.toThrow();
    expect(code(() => refuserDoublon(l, f({ id: 'n', pieceId: 'z' })))).toBe('doublon_piece');
  });

  it('sans-piece-jamais-doublon', () => {
    const l = [f({ id: 'a' }), f({ id: 'b' }), f({ id: 'c', pieceId: '' }), f({ id: 'd', pieceId: '' })];
    expect(doublonsDePiece(l)).toEqual([]);
    expect(() => refuserDoublon(l, f({ id: 'n' }))).not.toThrow();
    expect(() => refuserDoublon(l, f({ id: 'n', pieceId: '' }))).not.toThrow();
  });

  it('montant-sur-bareme-a-verifier', () => {
    const t = f({ nature: 'trajet' });
    expect(violations(t, { baremeAVerifier: true, montantTrajet: centimes(1) })).toEqual(['inv5_montant_sur_bareme_a_verifier']);
    expect(violations(t, { baremeAVerifier: true, montantTrajet: centimes(-5) })).toEqual(['inv5_montant_sur_bareme_a_verifier']);
    expect(violations(t, { baremeAVerifier: false, montantTrajet: centimes(900) })).toEqual([]);
    expect(violations(t, { montantTrajet: centimes(900) })).toEqual([]);
    expect(code(() => verifierInvariants(t, { baremeAVerifier: true, montantTrajet: centimes(900) }))).toBe('entree_invalide');
    const deux = violations(f({ payeur: 'societe', remboursementId: 'r' }), { baremeAVerifier: true, montantTrajet: centimes(7) });
    expect(deux).toEqual(['inv1_paye_societe_rembourse', 'inv5_montant_sur_bareme_a_verifier']);
  });

  it('montant-nul-sur-bareme-a-verifier-accepte', () => {
    const t = f({ nature: 'trajet' });
    expect(violations(t, { baremeAVerifier: true, montantTrajet: centimes(0) })).toEqual([]);
    expect(violations(t, { baremeAVerifier: true, montantTrajet: null })).toEqual([]);
    expect(violations(t, { baremeAVerifier: true })).toEqual([]);
    expect(() => verifierInvariants(t, { baremeAVerifier: true, montantTrajet: centimes(0) })).not.toThrow();
  });

  it('entrees-limites', () => {
    expect(doublonsDePiece([])).toEqual([]);
    expect(() => refuserDoublon([], f({ pieceId: 'z' }))).not.toThrow();
    expect(violations(f())).toEqual([]);
    for (const m of [Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
      for (const baremeAVerifier of [true, false]) {
        expect(code(() => violations(f(), { baremeAVerifier, montantTrajet: m as Centimes }))).toBe('entree_invalide');
      }
    }
    expect(code(() => verifierInvariants(f(), { montantTrajet: Number.NaN as Centimes }))).toBe('entree_invalide');
  });
});
