// TVA française facturée à tort sur un achat : TVA de la pièce bloquée, données du brouillon de demande de
// facture rectifiée (motif `tva_a_tort`, entrée du brouillon de rectification), levée à réception.
// Fonctions pures, centimes entiers, codes seulement. Rien n'est envoyé : la personne envoie elle-même.
// Jamais de TVA déduite par défaut, jamais d'estimation.
import { type Centimes, centimes } from '../argent/index.js';
import { analyserNumeroTva } from '../controles/regles/numero-tva.js';

export interface PieceAchat {
  id: string;
  sens: 'achat' | 'vente';
  fournisseurId: string;
  /** TVA française lue sur la pièce, en centimes entiers. */
  tvaFranceCentimes: number;
}

export interface ContexteTvaATort {
  numeroTvaSociete: string;
  /** Déclaré par la personne, jamais deviné. */
  operationSansTva: boolean;
}

export interface BlocageTva {
  pieceId: string;
  tvaBloquee: Centimes;
}

export type DetectionTvaATort = { aTort: true; tvaBloquee: Centimes } | { aTort: false };

export interface DonneesBrouillon {
  pieceId: string;
  fournisseurId: string;
  ecart: Centimes;
  motif: 'tva_a_tort';
  texteAttendu: 'mention_operation_sans_tva';
  envoi: 'par_le_client';
}

function montantEntier(n: number): number {
  if (!Number.isSafeInteger(n) || n < 0) throw new RangeError('montant_invalide');
  return n;
}

export function detecterTvaATort(piece: PieceAchat, contexte: ContexteTvaATort): DetectionTvaATort {
  const tva = montantEntier(piece.tvaFranceCentimes);
  if (piece.sens !== 'achat' || tva === 0 || !contexte.operationSansTva) return { aTort: false };
  if (analyserNumeroTva(contexte.numeroTvaSociete).statut !== 'cle_juste') return { aTort: false };
  return { aTort: true, tvaBloquee: centimes(tva) };
}

export function donneesBrouillon(piece: PieceAchat, tvaBloquee: Centimes): DonneesBrouillon {
  return {
    pieceId: piece.id,
    fournisseurId: piece.fournisseurId,
    ecart: tvaBloquee,
    motif: 'tva_a_tort',
    texteAttendu: 'mention_operation_sans_tva',
    envoi: 'par_le_client',
  };
}

/** Levée seulement si la facture rectifiée reçue porte 0 de TVA française ; sinon la TVA reste bloquée. */
export function leverBlocage(
  blocage: BlocageTva,
  factureRecue: { tvaFranceCentimes: number },
): { leve: true } | { leve: false; tvaBloquee: Centimes } {
  return montantEntier(factureRecue.tvaFranceCentimes) === 0 ? { leve: true } : { leve: false, tvaBloquee: blocage.tvaBloquee };
}
