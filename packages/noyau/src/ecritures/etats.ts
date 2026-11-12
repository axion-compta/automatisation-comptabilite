// États d'une écriture : brouillon, proposé, validé, et délai d'annulation.
// Fonctions pures : aucune horloge interne, `maintenant` (en millisecondes) vient de l'appelant.
import { ErreurEcriture, verifierEcriture, type Ecriture } from './modele.js';
import { exigerJustification, type LienPieceEcriture } from './lien-piece.js';

export interface DemandeValidation {
  ecritureId: string;
  echeance: number;
}

export type EcritureValidee = Ecriture & {
  statut: 'valide';
  numero: string;
  validePar: string;
  valideLe: string;
};

/** Brouillon vers proposé, après contrôle de l'écriture. */
export function proposer(e: Ecriture): Ecriture {
  if (e.statut !== 'brouillon') {
    throw new ErreurEcriture('transition_interdite', 'Seul un brouillon peut être proposé.');
  }
  verifierEcriture(e);
  return { ...e, statut: 'propose' };
}

function controlerInstant(valeur: number): void {
  if (!Number.isSafeInteger(valeur) || valeur < 0) {
    throw new ErreurEcriture(
      'delai_invalide',
      'Un instant doit être un entier positif ou nul (millisecondes).',
    );
  }
}

/** Crée la demande de validation : échéance = maintenant + délai. */
export function demanderValidation(
  e: Ecriture,
  maintenant: number,
  delaiMs: number,
): DemandeValidation {
  if (e.statut !== 'propose') {
    throw new ErreurEcriture('transition_interdite', 'Seule une écriture proposée se valide.');
  }
  if (!Number.isInteger(delaiMs) || delaiMs <= 0) {
    throw new ErreurEcriture('delai_invalide', 'Le délai doit être un entier positif.');
  }
  controlerInstant(maintenant);
  const echeance = maintenant + delaiMs;
  controlerInstant(echeance);
  return { ecritureId: e.id, echeance };
}

/** Annulation permise strictement avant l'échéance. */
export function annulerValidation(demande: DemandeValidation, maintenant: number): 'annulee' {
  controlerInstant(maintenant);
  controlerInstant(demande.echeance);
  if (maintenant >= demande.echeance) {
    throw new ErreurEcriture('delai_depasse', "Le délai d'annulation est dépassé.");
  }
  return 'annulee';
}

export function validationEchue(demande: DemandeValidation, maintenant: number): boolean {
  controlerInstant(maintenant);
  controlerInstant(demande.echeance);
  return maintenant >= demande.echeance;
}

/** Proposé vers validé : retourne une copie, l'entrée n'est jamais modifiée. */
export function valider(
  e: Ecriture,
  numero: string,
  validePar: string,
  valideLe: string,
): EcritureValidee {
  if (e.statut !== 'propose') {
    throw new ErreurEcriture('transition_interdite', 'Seule une écriture proposée se valide.');
  }
  verifierEcriture(e);
  return { ...e, statut: 'valide', numero, validePar, valideLe };
}

/** Proposé vers brouillon ; une écriture validée est immuable. */
export function repasserEnBrouillon(e: Ecriture): Ecriture {
  if (e.statut !== 'propose') {
    throw new ErreurEcriture('transition_interdite', 'Seule une écriture proposée repasse en brouillon.');
  }
  return { ...e, statut: 'brouillon' };
}

/** Validation qui exige une pièce liée ou un motif, puis applique `valider` inchangé. */
export function validerJustifiee(
  e: Ecriture,
  liens: readonly LienPieceEcriture[],
  numero: string,
  validePar: string,
  valideLe: string,
  motif: string,
): EcritureValidee {
  exigerJustification(e.id, liens, motif);
  return valider(e, numero, validePar, valideLe);
}
