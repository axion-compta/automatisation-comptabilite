// Estimation de l'impôt sur les sociétés à partir du résultat comptable (centimes).
// Aucun taux, plafond ni seuil n'est écrit ici : le barème est un argument (points de base, centimes).
// Ce n'est jamais un montant dû : le résultat est toujours marqué « estimation ».
import { centimes, fraction, pourcentage, soustraire, ajouter, type Centimes } from '../argent/index.js';

export interface BaremeIs {
  /** Taux normal, en points de base. */
  tauxNormal: number;
  /** Taux réduit, en points de base. */
  tauxReduit: number;
  /** Part de résultat soumise au taux réduit, pour un exercice de référence. */
  plafondBeneficeReduit: Centimes;
  /** Le taux réduit n'est retenu que si le chiffre d'affaires est strictement inférieur. */
  chiffreAffairesMax: Centimes;
  /** Détention minimale par des personnes physiques, en points de base. */
  detentionMin: number;
  /** Nombre de mois de l'exercice de référence (le plafond est proratisé au-delà ou en deçà). */
  moisReference: number;
  /** Faux tant que les paramètres du catalogue ne sont pas vérifiés. */
  verifie: boolean;
}

export interface ContexteIs {
  /** Détention du capital par des personnes physiques, en points de base ; `null` si inconnue. */
  detention: number | null;
  /** Durée de l'exercice en mois ; par défaut, celle du barème. */
  moisExercice?: number;
}

export type RaisonIs = 'bareme_non_verifie' | 'detention_inconnue';

export interface EstimationIs {
  mot: 'estimation';
  montant: Centimes;
  /** Part du résultat au taux réduit. */
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

  // Détention inconnue : le taux réduit n'est pas retenu (l'estimation reste prudente).
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
