import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import { detecterTvaATort, donneesBrouillon, leverBlocage, type PieceAchat } from '../facture-rectifiee.js';

// Données inventées : SIREN 123456782 (clé de Luhn valide) donne la clé de TVA 11.
const NUMERO_VALIDE = 'FR11123456782';
const NUMERO_CLE_FAUSSE = 'FR99123456782';
// Facture de 100 000 HT et 20 000 de TVA.
const piece = (sur: Partial<PieceAchat> = {}): PieceAchat => ({
  id: 'piece-1',
  sens: 'achat',
  fournisseurId: 'fournisseur-fictif-1',
  tvaFranceCentimes: 20000,
  ...sur,
});
const contexte = { numeroTvaSociete: NUMERO_VALIDE, operationSansTva: true };

describe('TVA française facturée à tort', () => {
  it('tva-a-tort-bloquee-20000', () => {
    expect(detecterTvaATort(piece(), contexte)).toEqual({ aTort: true, tvaBloquee: centimes(20000) });
    // Rien n'est deviné : opération non déclarée sans TVA, vente, ou aucune TVA = pas de détection.
    expect(detecterTvaATort(piece(), { ...contexte, operationSansTva: false })).toEqual({ aTort: false });
    expect(detecterTvaATort(piece({ sens: 'vente' }), contexte)).toEqual({ aTort: false });
    expect(detecterTvaATort(piece({ tvaFranceCentimes: 0 }), contexte)).toEqual({ aTort: false });
    expect(() => detecterTvaATort(piece({ tvaFranceCentimes: 1.5 }), contexte)).toThrow();
  });

  it('brouillon-cite-ecart-20000', () => {
    expect(donneesBrouillon(piece(), centimes(20000))).toEqual({
      pieceId: 'piece-1',
      fournisseurId: 'fournisseur-fictif-1',
      ecart: centimes(20000),
      motif: 'tva_a_tort',
      texteAttendu: 'mention_operation_sans_tva',
      envoi: 'par_le_client',
    });
  });

  it('numero-invalide-pas-de-detection', () => {
    for (const numeroTvaSociete of [NUMERO_CLE_FAUSSE, 'FR00000000000', 'DE123456789', 'FR12', '']) {
      expect(detecterTvaATort(piece(), { ...contexte, numeroTvaSociete })).toEqual({ aTort: false });
    }
  });

  it('facture-rectifiee-recue-leve-blocage', () => {
    const blocage = { pieceId: 'piece-1', tvaBloquee: centimes(20000) };
    expect(leverBlocage(blocage, { tvaFranceCentimes: 0 })).toEqual({ leve: true });
  });

  it('rectifiee-avec-tva-reste-bloquee', () => {
    const blocage = { pieceId: 'piece-1', tvaBloquee: centimes(20000) };
    expect(leverBlocage(blocage, { tvaFranceCentimes: 20000 })).toEqual({ leve: false, tvaBloquee: centimes(20000) });
    expect(leverBlocage(blocage, { tvaFranceCentimes: 1 })).toEqual({ leve: false, tvaBloquee: centimes(20000) });
    // Facture reçue illisible : jamais de levée par défaut.
    expect(() => leverBlocage(blocage, { tvaFranceCentimes: Number.NaN })).toThrow();
  });
});
