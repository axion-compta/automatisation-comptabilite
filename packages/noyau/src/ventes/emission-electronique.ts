// Signalement « à émettre par votre plateforme agréée » (A20) : la date vient d'un paramètre.
import { comparerDates, exigerDate } from './types.js';
import type { NatureClient, OrigineVente } from './types.js';

// Forme minimale d'une ligne de paramètre datée ; seule la valeur « valide » sert à un contrôle officiel.
export interface ParametreEmission {
  valeur: string;
  statut: string;
}
export interface EntreeEmission {
  dateFacture: string;
  paysClient: string;
  natureClient: NatureClient;
  origine: OrigineVente;
  parametre: ParametreEmission | undefined;
}
export interface SortieEmission {
  signal: boolean;
  aVerifier: boolean;
  parametreAbsent: boolean;
}

const STATUT_VALIDE = 'valide';
const PAYS_FRANCE = 'FR';

export function aEmettreParPlateforme(entree: EntreeEmission): SortieEmission {
  const dateFacture = exigerDate(entree.dateFacture, 'dateFacture');
  const { parametre } = entree;
  if (parametre === undefined) return { signal: false, aVerifier: false, parametreAbsent: true };
  const debut = exigerDate(parametre.valeur, 'parametre');
  const signal =
    comparerDates(dateFacture, debut) >= 0 &&
    entree.paysClient === PAYS_FRANCE &&
    entree.natureClient === 'professionnel' &&
    entree.origine !== 'plateforme_agreee';
  return { signal, aVerifier: parametre.statut !== STATUT_VALIDE, parametreAbsent: false };
}
