import { describe, expect, it } from 'vitest';
import { centimes as c } from '../../../argent/index.js';
import { ErreurPiece, MOTIFS_NON_COMPTEE, TYPES_PIECE, type TypePiece } from '../../types.js';
import { MOTS_CLES_TYPES } from '../mots-cles-types.js';
import { compteeParDefaut, confirmerType, typeParRegles } from '../typologie.js';

const code = (f: () => unknown): string | undefined => {
  try { f(); } catch (e) { return e instanceof ErreurPiece ? e.code : 'autre'; }
  return undefined;
};
const ind = (texte: string, extra: { ttc?: number; ht?: number; nombreDeNumerosDeFacture?: number } = {}) =>
  ({ texte, nombreDeNumerosDeFacture: 1, ...(extra.ttc === undefined ? {} : { ttc: c(extra.ttc) }), ...(extra.ht === undefined ? {} : { ht: c(extra.ht) }), ...(extra.nombreDeNumerosDeFacture === undefined ? {} : { nombreDeNumerosDeFacture: extra.nombreDeNumerosDeFacture }) });

describe('typologie', () => {
  it('facture-confirmee', () => {
    expect(typeParRegles(ind('Facture F-0001 du fournisseur Alpha', { ttc: 12000, ht: 10000 }))).toBeNull();
    expect(confirmerType('facture', ind('Facture F-0001', { ttc: 12000, ht: 10000 }))).toEqual({ type: 'facture' });
    expect(confirmerType('avoir', ind('Avoir A-1', { ttc: -100 }))).toEqual({ type: 'avoir' });
    expect(MOTS_CLES_TYPES.version).toBe(1);
  });
  it('avoir-par-mot-cle', () => {
    expect(typeParRegles(ind('AVOIR n° 12'))).toBe('avoir');
    expect(typeParRegles(ind('Credit note 45'))).toBe('avoir');
    expect(typeParRegles(ind('Il faut pouvoir payer'))).toBeNull();
    expect(typeParRegles(ind('avoirs'))).toBeNull();
    expect(typeParRegles(ind('acompte 30'))).toBe('facture_acompte');
    expect(typeParRegles(ind('Down payment'))).toBe('facture_acompte');
    expect(typeParRegles(ind('Relevé de compte'))).toBe('releve_fournisseur');
    expect(typeParRegles(ind('Statement of account'))).toBe('releve_fournisseur');
  });
  it('avoir-par-montant-negatif', () => {
    expect(typeParRegles(ind('Facture', { ttc: -1 }))).toBe('avoir');
    expect(typeParRegles(ind('Facture', { ttc: 0, ht: 0 }))).toBe('montant_zero');
    expect(typeParRegles(ind('Facture', { ttc: 1 }))).toBeNull();
    expect(confirmerType('facture', ind('Facture', { ttc: -12000 }))).toEqual({ type: 'facture', aVerifier: 'desaccord_type' });
  });
  it('desaccord-a-verifier', () => {
    expect(confirmerType('facture', ind('Credit note'))).toEqual({ type: 'facture', aVerifier: 'desaccord_type' });
    expect(confirmerType('avoir', ind('Credit note'))).toEqual({ type: 'avoir' });
    expect(confirmerType('facture', ind(''))).toEqual({ type: 'facture' });
  });
  it('bon-de-commande-non-piece-non-compte', () => {
    expect(typeParRegles(ind('Bon de commande 77'))).toBe('non_piece');
    expect(typeParRegles(ind('Purchase order 77'))).toBe('non_piece');
    expect(confirmerType('non_piece', ind('Bon de commande 77'))).toEqual({ type: 'non_piece', motifNonPiece: 'commande' });
    for (const [t, m] of [['Devis 5', 'devis'], ['Quotation', 'devis'], ['Contrat', 'contrat'], ['Reservation', 'reservation'], ['Rappel', 'rappel']] as const) {
      expect(confirmerType('non_piece', ind(t)).motifNonPiece).toBe(m);
    }
    expect(compteeParDefaut('non_piece', 'commande')).toEqual({ comptee: false, motif: 'commande' });
    expect(compteeParDefaut('non_piece')).toEqual({ comptee: false, motif: 'autre' });
  });
  it('trois-factures-plusieurs-factures', () => {
    const i = ind('Factures F-1 F-2 F-3', { nombreDeNumerosDeFacture: 3 });
    expect(typeParRegles(i)).toBe('plusieurs_factures');
    expect(typeParRegles(ind('Facture', { nombreDeNumerosDeFacture: 2 }))).toBe('plusieurs_factures');
    expect(typeParRegles(ind('Facture', { nombreDeNumerosDeFacture: 1 }))).toBeNull();
    expect(confirmerType('facture', i)).toEqual({ type: 'plusieurs_factures', aVerifier: 'plusieurs_factures' });
    expect(compteeParDefaut('plusieurs_factures')).toEqual({ comptee: false, motif: 'plusieurs_factures' });
  });
  it('montant-zero-et-ttc-nul-ht-non-nul', () => {
    expect(confirmerType('montant_zero', ind('Facture', { ttc: 0, ht: 0 }))).toEqual({ type: 'montant_zero' });
    expect(confirmerType('facture', ind('Facture', { ttc: 0, ht: 10000 }))).toEqual({ type: 'facture', aVerifier: 'ttc_nul_ht_non_nul' });
    expect(confirmerType('facture', ind('Facture', { ttc: 0 }))).toEqual({ type: 'facture' });
    expect(typeParRegles(ind('Facture', { ttc: 0, ht: 10000 }))).toBeNull();
  });
  it('table-comptee-complete', () => {
    const attendu: Record<TypePiece, string> = {
      facture: 'oui', facture_acompte: 'oui', recu: 'oui', ticket: 'oui', avoir: 'oui', reemise: 'oui',
      annulee: 'annulee', montant_zero: 'montant_zero', releve_fournisseur: 'releve', plusieurs_factures: 'plusieurs_factures',
      inconnu: 'inconnu', facture_dans_corps: 'a_verifier', non_piece: 'autre',
    };
    expect(TYPES_PIECE).toHaveLength(13);
    for (const t of TYPES_PIECE) {
      const r = compteeParDefaut(t);
      if (r.comptee) expect(attendu[t]).toBe('oui');
      else { expect(r.motif).toBe(attendu[t]); expect(MOTIFS_NON_COMPTEE).toContain(r.motif); }
    }
  });
  it('texte-vide-garde-le-propose', () => {
    for (const t of TYPES_PIECE) expect(confirmerType(t, ind(''))).toEqual({ type: t });
    expect(typeParRegles(ind('   '))).toBeNull();
    expect(typeParRegles({ texte: undefined as never, nombreDeNumerosDeFacture: 1 })).toBeNull();
  });
  it('entrees-invalides-refusees', () => {
    for (const v of [Number.NaN, Number.POSITIVE_INFINITY, 0.5]) {
      expect(code(() => typeParRegles({ texte: '', ttc: v as never, nombreDeNumerosDeFacture: 1 }))).toBe('montant_invalide');
      expect(code(() => typeParRegles({ texte: '', ht: v as never, nombreDeNumerosDeFacture: 1 }))).toBe('montant_invalide');
    }
    for (const n of [-1, 0.5, Number.NaN]) expect(code(() => typeParRegles({ texte: '', nombreDeNumerosDeFacture: n }))).toBe('nombre_invalide');
    expect(code(() => confirmerType('facture', { texte: '', ttc: Number.NaN as never, nombreDeNumerosDeFacture: 1 }))).toBe('montant_invalide');
  });
  it('mots-cles-en-minuscules-sans-accents', () => {
    const listes = [MOTS_CLES_TYPES.avoir, MOTS_CLES_TYPES.acompte, MOTS_CLES_TYPES.releve, MOTS_CLES_TYPES.commande, MOTS_CLES_TYPES.devis, MOTS_CLES_TYPES.contrat, MOTS_CLES_TYPES.reservation, MOTS_CLES_TYPES.rappel];
    for (const liste of listes) {
      for (const m of liste) expect(m).toBe(m.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase());
    }
  });
});
