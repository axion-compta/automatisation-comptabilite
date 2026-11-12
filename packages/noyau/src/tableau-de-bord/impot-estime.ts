// Estimation de l'IS depuis le résultat comptable (centimes) ; barème en argument, jamais un montant dû.
import { centimes, fraction, pourcentage, soustraire, ajouter, type Centimes } from '../argent/index.js';

export interface BaremeIs {
  tauxNormal: number;
  tauxReduit: number;
  plafondBeneficeReduit: Centimes;
  chiffreAffairesMax: Centimes;
  detentionMin: number;
  moisReference: number;
  verifie: boolean;
}

export interface ContexteIs {
  detention: number | null;
  moisExercice?: number;
}

export type RaisonIs = 'bareme_non_verifie' | 'detention_inconnue';

export interface EstimationIs {
  mot: 'estimation';
  montant: Centimes;
  partieReduite: Centimes;
  aVerifier: boolean;
  raisons: RaisonIs[];
}

export function estimerIs(
  resultat: Centimes,
  chiffreAffaires: Centimes,
  bareme: BaremeIs,
  contexte: ContexteIs,
): EstimationIs {
  const raisons: RaisonIs[] = [];
  if (!bareme.verifie) raisons.push('bareme_non_verifie');
  if (contexte.detention === null) raisons.push('detention_inconnue');
  const sortie = (montant: Centimes, partieReduite: Centimes): EstimationIs => ({
    mot: 'estimation',
    montant,
    partieReduite,
    aVerifier: raisons.length > 0,
    raisons,
  });
  if (resultat <= 0) return sortie(centimes(0), centimes(0));

  const eligible =
    contexte.detention !== null &&
    contexte.detention >= bareme.detentionMin &&
    chiffreAffaires < bareme.chiffreAffairesMax;
  const mois = contexte.moisExercice ?? bareme.moisReference;
  const limite = fraction(bareme.plafondBeneficeReduit, mois, bareme.moisReference, 'demi-superieur');
  const reduite = eligible ? centimes(Math.min(resultat, limite)) : centimes(0);
  const normale = soustraire(resultat, reduite);
  const impot = ajouter(
    pourcentage(reduite, bareme.tauxReduit, 'demi-superieur'),
    pourcentage(normale, bareme.tauxNormal, 'demi-superieur'),
  );
  return sortie(impot, reduite);
}
