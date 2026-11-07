// Classificateur : ordre fixe des sources (règle, historique concordant, IA avec exemples, IA seule).
// Aucun appel au modèle : les propositions de l'IA sont des arguments. Aucune division.
import { ErreurChat, type Confiance, type SourceProposition } from '../chat/types.js';

export type Imputation = { readonly compte: string; readonly journal: string };
export type EntreeClassement = {
  regle?: Imputation;
  historique: readonly Imputation[];
  propositionIaExemples?: Imputation;
  propositionIaSeule?: Imputation;
};
export type ReglagesClassement = { seuilPointsDeBase: number; minimumHistorique: number };
export type Decision =
  | { readonly compte: string; readonly journal: string; readonly source: SourceProposition; readonly confiance: Confiance }
  | { readonly source: 'aucune'; readonly confiance: 'douteux' };

const BASE_POINTS = 10_000;

type Frequence = { compte: string; journal: string; occurrences: number };

function frequences(historique: readonly Imputation[]): Frequence[] {
  const par = new Map<string, Frequence>();
  for (const h of historique) {
    const f = par.get(h.compte);
    if (f) f.occurrences += 1;
    else par.set(h.compte, { compte: h.compte, journal: h.journal, occurrences: 1 });
  }
  return [...par.values()].sort((a, b) => b.occurrences - a.occurrences);
}

export function classer(entree: EntreeClassement, reglages: ReglagesClassement): Decision {
  const { seuilPointsDeBase: seuil, minimumHistorique: minimum } = reglages;
  if (!Number.isSafeInteger(seuil) || seuil < 0 || seuil > BASE_POINTS) throw new ErreurChat('parametre_invalide');
  if (!Number.isSafeInteger(minimum) || minimum < 0) throw new ErreurChat('parametre_invalide');

  if (entree.regle) {
    return { compte: entree.regle.compte, journal: entree.regle.journal, source: 'regle_societe', confiance: 'sur' };
  }
  const total = entree.historique.length;
  const freq = frequences(entree.historique);
  const tete = freq[0];
  const unique = tete !== undefined && freq[1]?.occurrences !== tete.occurrences;
  if (tete && unique && total >= minimum && tete.occurrences * BASE_POINTS >= seuil * total) {
    return { compte: tete.compte, journal: tete.journal, source: 'historique', confiance: 'sur' };
  }
  const exemples = entree.propositionIaExemples;
  if (exemples) {
    const confiance: Confiance = tete && unique && tete.compte === exemples.compte ? 'sur' : 'a_verifier';
    return { compte: exemples.compte, journal: exemples.journal, source: 'ia_exemples', confiance };
  }
  const seule = entree.propositionIaSeule;
  if (seule) return { compte: seule.compte, journal: seule.journal, source: 'ia_seule', confiance: 'a_verifier' };
  return { source: 'aucune', confiance: 'douteux' };
}
