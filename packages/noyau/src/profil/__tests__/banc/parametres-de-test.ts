// Paramètres du banc du profil 1 (spec 09 §05 : valeurs du tableau de 03, statut `valide` pour le banc seulement).
// Unités : taux et pourcentages en points de base, montants en centimes. Relevé du 06/11/2026 (fiches L09-T26 et L09-T27).
import type { Arrondi } from '../../../argent/index.js';

export type ParametreTest = {
  cle: string;
  valeur: number;
  source_url: string;
  date_releve: '2026-11-06';
  statut: 'valide';
};

const IS = 'https://entreprendre.service-public.gouv.fr/vosdroits/F23575';
const MICRO = 'https://entreprendre.service-public.gouv.fr/vosdroits/F23267';
const FRANCHISE = 'https://entreprendre.service-public.gouv.fr/vosdroits/F21746';
const ALERTE = 'spec 09, 02-regimes-fiscaux.md, règle 6';
const p = (cle: string, valeur: number, source_url: string): ParametreTest => ({ cle, valeur, source_url, date_releve: '2026-11-06', statut: 'valide' });

export const PARAMETRES_TEST: readonly ParametreTest[] = [
  p('is.taux.reduit', 1500, IS),
  p('is.taux.normal', 2500, IS),
  p('is.plafond_benefice_reduit', 4250000, IS),
  p('is.taux_reduit.detention_pp', 7500, IS),
  p('micro.plafond.services', 8360000, MICRO),
  p('tva.franchise.seuil.services.base', 3750000, FRANCHISE),
  p('tva.franchise.seuil.services.majore', 4125000, FRANCHISE),
  p('alerte.seuil_pct', 9000, ALERTE),
];

export function param(cle: string): number {
  const ligne = PARAMETRES_TEST.find((l) => l.cle === cle);
  if (ligne === undefined || ligne.statut !== 'valide') throw new Error('parametre_de_test_absent: ' + cle);
  return ligne.valeur;
}

export const ARRONDI_TEST: Arrondi = 'demi-superieur';
export const FRAICHEUR_TEST_MOIS = 12;
export const DELAI_TEST_MS = 50;
export const LIMITE_SAISIE_MS = 5000;
