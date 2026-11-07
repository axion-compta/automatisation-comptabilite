// États d'une écriture : brouillon, proposé, validé, et délai d'annulation.
// Fonctions pures : aucune horloge interne, `maintenant` (en millisecondes) vient de l'appelant.
import { ErreurEcriture, verifierEcriture, type Ecriture } from './modele.js';

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
  return { ecritureId: e.id, echeance: maintenant + delaiMs };
}

/** Annulation permise strictement avant l'échéance. */
export function annulerValidation(demande: DemandeValidation, maintenant: number): 'annulee' {
  if (maintenant >= demande.echeance) {
    throw new ErreurEcriture('delai_depasse', "Le délai d'annulation est dépassé.");
  }
  return 'annulee';
}

export function validationEchue(demande: DemandeValidation, maintenant: number): boolean {
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
  return { ...e, statut: 'valide', numero, validePar, valideLe };
}

/** Proposé vers brouillon ; une écriture validée est immuable. */
export function repasserEnBrouillon(e: Ecriture): Ecriture {
  if (e.statut !== 'propose') {
    throw new ErreurEcriture('transition_interdite', 'Seule une écriture proposée repasse en brouillon.');
  }
  return { ...e, statut: 'brouillon' };
}
