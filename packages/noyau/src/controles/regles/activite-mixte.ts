// Contrôle CC-T20 : ventes exonérées ou activité mixte, la préparation de la déclaration de TVA est bloquée.
// Le dossier part vers l'expert ; aucune écriture n'est produite et aucun prorata n'est calculé (V1).
// Le profil « activité mixte » et la liste des codes exonérés sont lus en argument, jamais cherchés ici.
import type { Declencheur, RegleControle, SortieRegle } from '../moteur.js';
import { ErreurControle } from './commun.js';

/** Code de traitement d'une vente non encore tranché (déclaré par le lot des ventes). */
export const CODE_EXONEREE_A_VERIFIER = 'EXONEREE_A_VERIFIER';
export const SORTIE_ACTIVITE_MIXTE = 'activite_mixte_expert';

export interface VentePeriode {
  codeTva: string;
}

export interface ObjetActiviteMixte {
  /** Ventes de la période. */
  ventes: readonly VentePeriode[];
  /** Codes de TVA qui désignent une vente exonérée. */
  codesExoneres: readonly string[];
  /** Le profil de la société déclare une activité mixte. */
  activiteMixte: boolean;
}

function evaluerActiviteMixte(o: ObjetActiviteMixte): SortieRegle {
  if (typeof o.activiteMixte !== 'boolean' || !Array.isArray(o.ventes) || !Array.isArray(o.codesExoneres)) {
    throw new ErreurControle('entree_invalide');
  }
  for (const v of o.ventes) if (typeof v?.codeTva !== 'string') throw new ErreurControle('entree_invalide');
  const exonere = o.ventes.some((v) => v.codeTva === CODE_EXONEREE_A_VERIFIER || o.codesExoneres.includes(v.codeTva));
  return o.activiteMixte || exonere ? { resultat: 'ALERTE', valeur: SORTIE_ACTIVITE_MIXTE } : { resultat: 'OK' };
}

export const regleCCT20: RegleControle<ObjetActiviteMixte> = {
  id: 'CC-T20',
  version: 1,
  gravite: 'B',
  bloque: ['tva'],
  declencheurs: ['arrivee', 'continu', 'avant_tva', 'a_la_demande'] satisfies Declencheur[],
  actif: true,
  evaluer: evaluerActiviteMixte,
};
