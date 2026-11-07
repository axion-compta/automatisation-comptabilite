// Écritures E2 (indemnités d'un trajet) et E4 (régularisation annuelle) : jamais de ligne de TVA.
import { centimes, type Centimes } from '../argent/index.js';
import type { Ecriture } from '../ecritures/modele.js';
import { ErreurFrais, type ComptesFrais } from './types.js';

export interface EnteteEcriture {
  id: string;
  journal: string;
  date: string;
  libelle: string;
}

function entier(valeur: number): void {
  if (!Number.isSafeInteger(valeur)) {
    throw new ErreurFrais('entree_invalide', 'Montant entier de centimes attendu');
  }
}

function ecriture(debit: string, credit: string, montant: Centimes, e: EnteteEcriture): Ecriture {
  const zero = centimes(0);
  return {
    id: e.id,
    journal: e.journal,
    date: e.date,
    statut: 'propose',
    lignes: [
      { compte: debit, libelle: e.libelle, debit: montant, credit: zero },
      { compte: credit, libelle: e.libelle, debit: zero, credit: montant },
    ],
  };
}

/** E2 : D charge IK / C compte de la personne. Montant nul ou absent : aucune écriture. */
export function proposerEcritureTrajet(montant: Centimes | null, comptes: ComptesFrais, entete: EnteteEcriture): Ecriture | null {
  if (montant === null) return null;
  entier(montant);
  if (montant < 0) throw new ErreurFrais('entree_invalide', 'Montant négatif refusé');
  if (montant === 0) return null;
  return ecriture(comptes.chargeIk, comptes.comptePersonne, montant, entete);
}

/** E4 : écart > 0 : D charge IK / C personne ; écart < 0 : sens inverse ; nul : aucune écriture. */
export function proposerRegularisation(ecart: Centimes, comptes: ComptesFrais, entete: EnteteEcriture): Ecriture | null {
  entier(ecart);
  if (ecart === 0) return null;
  if (ecart > 0) return ecriture(comptes.chargeIk, comptes.comptePersonne, ecart, entete);
  return ecriture(comptes.comptePersonne, comptes.chargeIk, centimes(-ecart), entete);
}
