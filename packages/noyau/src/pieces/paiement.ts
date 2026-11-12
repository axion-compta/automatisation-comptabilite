// Paiement d'une pièce : qui a payé, par quel moyen, et avec quelle certitude. Codes seulement, aucun texte.
// Une lecture seule suppose ; seule une ligne de banque débitée prouve. Une valeur prouvée ne régresse jamais.
import type { MoyenPaiement } from './types.js';

export type PayeurPiece = 'societe' | 'dirigeant' | 'tiers' | 'inconnu';
export type CertitudePaiement = 'prouve' | 'suppose';

export interface PaiementPiece {
  payeur: PayeurPiece;
  moyen: MoyenPaiement | 'mixte';
  certitude: CertitudePaiement;
}

export interface LecturePaiement {
  moyen: MoyenPaiement;
  /** Payeur lu sur la pièce, s'il est connu. */
  payeur?: PayeurPiece;
}

export interface LigneBanquePaiement {
  moyen: MoyenPaiement;
  /** Montant débité en centimes ; seul un entier strictement positif prouve le paiement. */
  montantDebitCentimes: number;
}

function payeurDuMoyen(moyen: MoyenPaiement): PayeurPiece {
  if (moyen === 'carte_societe') return 'societe';
  if (moyen === 'autre_carte') return 'dirigeant';
  return 'inconnu';
}

/** Paiement lu sur la pièce : toujours supposé. */
export function paiementInitial(lecture: LecturePaiement): PaiementPiece {
  return { payeur: lecture.payeur ?? payeurDuMoyen(lecture.moyen), moyen: lecture.moyen, certitude: 'suppose' };
}

/** Complète par une ligne de banque débitée ; sans débit, ou si déjà prouvé, rend le paiement tel quel. */
export function completerParRapprochement(paiement: PaiementPiece, ligne: LigneBanquePaiement | null): PaiementPiece {
  if (paiement.certitude === 'prouve') return paiement;
  if (ligne === null || !Number.isSafeInteger(ligne.montantDebitCentimes) || ligne.montantDebitCentimes <= 0) return paiement;
  return { payeur: paiement.payeur === 'inconnu' ? 'societe' : paiement.payeur, moyen: ligne.moyen, certitude: 'prouve' };
}

/** Provisoire tant que la certitude n'est pas `prouve`. */
export function estProvisoire(paiement: PaiementPiece): boolean {
  return paiement.certitude !== 'prouve';
}
