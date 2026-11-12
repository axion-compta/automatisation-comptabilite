// Banc de conversation fictif (V3-CHT-071) : jetons par tour, médiane et maximum, comparaison aux plafonds.
// Les plafonds sont des paramètres, sans valeur dans le dépôt ; sans plafond, le verdict est « non_mesure ».
import { mediane } from './evaluateur.mjs';

export const REPONSE_SANS_MODELE = 'Cette réponse est donnée sans modèle : la limite de ce tour est atteinte.';

const entierPositif = (n) => Number.isSafeInteger(n) && n > 0;
const jetonsValides = (n) => Number.isSafeInteger(n) && n >= 0;
const verifierPlafond = (p) => { if (p !== undefined && !entierPositif(p)) throw new Error('plafond_invalide'); };
const lire = (n) => { if (!jetonsValides(n)) throw new Error('jetons_invalides'); return n; };

/**
 * Rejoue `tours` ({ texte, ... }) avec un modèle simulé { estimer(tour), repondre(tour) -> { texte, jetons } }.
 * Un tour dont l'estimation atteint le plafond (>=) reçoit REPONSE_SANS_MODELE, sans appel du modèle (0 jeton).
 * Un tour mesuré au-dessus du plafond (>) est signalé « au_dessus ».
 */
export async function rejouer({ tours, modele, plafonds = {} }) {
  const { tour: plafondTour, mediane: plafondMediane } = plafonds ?? {};
  verifierPlafond(plafondTour);
  verifierPlafond(plafondMediane);
  const sortie = [];
  for (const [rang, t] of tours.entries()) {
    if (plafondTour !== undefined && lire(modele.estimer(t)) >= plafondTour) {
      sortie.push({ rang, jetons: 0, etat: 'sans_modele', reponse: REPONSE_SANS_MODELE });
      continue;
    }
    const { texte, jetons } = await modele.repondre(t);
    const n = lire(jetons);
    const etat = plafondTour === undefined ? 'mesure' : n > plafondTour ? 'au_dessus' : 'dans_le_plafond';
    sortie.push({ rang, jetons: n, etat, reponse: texte });
  }
  const jetons = sortie.map((s) => s.jetons);
  const med = jetons.length === 0 ? null : mediane(jetons);
  const max = jetons.length === 0 ? null : Math.max(...jetons);
  let verdict = 'non_mesure';
  if (jetons.length > 0 && (plafondTour !== undefined || plafondMediane !== undefined)) {
    const depasse = sortie.some((s) => s.etat === 'au_dessus' || s.etat === 'sans_modele') || (plafondMediane !== undefined && med > plafondMediane);
    verdict = depasse ? 'depasse' : 'dans_le_plafond';
  }
  return { tours: sortie, jetons, mediane: med, maximum: max, verdict };
}
