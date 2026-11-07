// Contrôle CC-PM03 : total analytique = total général, section système NON_AFFECTE visible.
// Aucun texte affiché ici : seulement des codes et des écarts.
import { ErreurAnalytique, type Ventilation } from '../../analytique/ventilation.js';
import { ajouter, centimes, soustraire, type Centimes } from '../../argent/index.js';
import type { RegleControle, SortieRegle } from '../moteur.js';

/** Section système : reçoit ce qui n'est pas ventilé, jamais supprimée. */
export const NON_AFFECTE = 'NON_AFFECTE';

export interface LigneMontant {
  id: string;
  montant: Centimes;
}

export interface EntreeAnalytique {
  lignes: readonly LigneMontant[];
  /** Dernière version de la ventilation de chaque ligne. */
  ventilations: readonly Ventilation[];
}

export interface TotauxAnalytiques {
  parSection: Record<string, Centimes>;
  nonAffecte: Centimes;
  totalAnalytique: Centimes;
  totalGeneral: Centimes;
  /** Total général moins total analytique : positif ou négatif, 0 si tout concorde. */
  ecart: Centimes;
}

function invalide(message: string): ErreurAnalytique {
  return new ErreurAnalytique('entree_invalide', message);
}

export function totauxAnalytiques(
  lignes: readonly LigneMontant[],
  ventilations: readonly Ventilation[],
): TotauxAnalytiques {
  const parLigne = new Map<string, Ventilation>();
  for (const v of ventilations) {
    if (parLigne.has(v.ligneId)) throw invalide('Deux ventilations pour une même ligne.');
    parLigne.set(v.ligneId, v);
  }
  const connues = new Set<string>();
  const parSection = new Map<string, Centimes>();
  const verser = (section: string, montant: Centimes): void => {
    parSection.set(section, ajouter(parSection.get(section) ?? centimes(0), montant));
  };
  let totalGeneral = centimes(0);
  let nonAffecte = centimes(0);
  let ventile = centimes(0);
  for (const l of lignes) {
    if (typeof l.id !== 'string' || l.id === '' || connues.has(l.id)) throw invalide('Identifiant de ligne invalide.');
    connues.add(l.id);
    totalGeneral = ajouter(totalGeneral, centimes(l.montant));
    let somme = centimes(0);
    for (const p of parLigne.get(l.id)?.parts ?? []) {
      if (p.sectionId === NON_AFFECTE) throw invalide('Section système non ventilable.');
      const m = centimes(p.montant);
      somme = ajouter(somme, m);
      verser(p.sectionId, m);
    }
    ventile = ajouter(ventile, somme);
    const reste = soustraire(l.montant, somme);
    // Une ventilation qui dépasse la ligne n'est pas absorbée : elle reste visible dans l'écart.
    const depasse = l.montant >= 0 ? reste < 0 : reste > 0;
    if (!depasse) nonAffecte = ajouter(nonAffecte, reste);
  }
  for (const id of parLigne.keys()) {
    if (!connues.has(id)) throw invalide('Ventilation d’une ligne inconnue.');
  }
  if (nonAffecte !== 0) verser(NON_AFFECTE, nonAffecte);
  const totalAnalytique = ajouter(ventile, nonAffecte);
  return {
    parSection: Object.fromEntries(parSection),
    nonAffecte,
    totalAnalytique,
    totalGeneral,
    ecart: soustraire(totalGeneral, totalAnalytique),
  };
}

/** CC-PM03 : le total analytique égale le total général, avant export et avant clôture. */
export const regleAnalytique: RegleControle<EntreeAnalytique> = {
  id: 'CC-PM03',
  version: 1,
  gravite: 'B',
  bloque: ['export', 'cloture'],
  declencheurs: ['avant_export', 'avant_cloture'],
  actif: true,
  evaluer: (entree): SortieRegle => {
    const { ecart } = totauxAnalytiques(entree.lignes, entree.ventilations);
    return ecart === 0 ? { resultat: 'OK' } : { resultat: 'ALERTE', ecartCentimes: ecart };
  },
};
