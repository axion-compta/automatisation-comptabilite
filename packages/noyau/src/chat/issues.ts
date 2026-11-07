// Issues d'un tour de chat : une seule fin parmi 6 ; une erreur donne une issue ; étapes issues d'appels réels (V3-CHT-053, 054, 072, 044).
import { CODES_ERREUR, ErreurChat, ISSUES, estDans, type CodeErreur, type Issue } from './types.js';

export interface EvenementTour {
  id: number;
  type: string;
  issue?: string;
  [cle: string]: unknown;
}
export type MotifTour =
  | 'vide' | 'sans_debut' | 'sans_fin' | 'fin_pas_derniere' | 'deux_fins'
  | 'id_non_croissant' | 'issue_inconnue' | 'proposition_sans_issue_action';
export type VerdictTour = { valide: true; issue: Issue } | { valide: false; motif: MotifTour };

const ISSUES_AVEC_PROPOSITION: readonly Issue[] = ['action_proposee', 'question'];

export function verifierTour(evenements: readonly EvenementTour[]): VerdictTour {
  const non = (motif: MotifTour): VerdictTour => ({ valide: false, motif });
  if (!Array.isArray(evenements) || evenements.length === 0) return non('vide');
  if (evenements[0]?.type !== 'tour.debut') return non('sans_debut');
  const fins = evenements.filter((e) => e.type === 'tour.fin');
  if (fins.length > 1) return non('deux_fins');
  const fin = fins[0];
  if (!fin) return non('sans_fin');
  if (evenements[evenements.length - 1] !== fin) return non('fin_pas_derniere');
  for (let i = 1; i < evenements.length; i++) {
    const avant = (evenements[i - 1] as EvenementTour).id;
    const id = (evenements[i] as EvenementTour).id;
    if (!(typeof id === 'number' && typeof avant === 'number' && id > avant)) return non('id_non_croissant');
  }
  if (!estDans(ISSUES, fin.issue)) return non('issue_inconnue');
  if (evenements.some((e) => e.type === 'proposition') && !ISSUES_AVEC_PROPOSITION.includes(fin.issue)) {
    return non('proposition_sans_issue_action');
  }
  return { valide: true, issue: fin.issue };
}

const ISSUE_PAR_ERREUR: Readonly<Record<CodeErreur, Issue>> = {
  parametre_invalide: 'refus_utile',
  outil_hors_liste: 'refus_utile',
  hors_schema: 'escalade',
  trop_de_demandes: 'reponse',
  budget_tour_atteint: 'reponse',
  budget_plan_atteint: 'reponse',
  ia_indisponible: 'escalade',
  proposition_inconnue: 'refus_utile',
  proposition_expiree: 'refus_utile',
  acteur_non_humain: 'refus_utile',
  droit_insuffisant: 'refus_utile',
  periode_cloturee: 'refus_utile',
  ecriture_validee: 'refus_utile',
  annulation_expiree: 'refus_utile',
  volume_trop_grand: 'reponse',
  niveau_ferme: 'refus_utile',
};

/** Table fermée des 16 codes ; un code inconnu est refusé. */
export function issuePourErreur(code: string): Issue {
  if (!estDans(CODES_ERREUR, code)) throw new ErreurChat('parametre_invalide');
  return ISSUE_PAR_ERREUR[code];
}

export interface AppelOutil {
  outil: string;
  dureeMs: number;
  issue: string;
}
export interface EtapeChat {
  outil: string;
  dureeMs: number;
  etat: string;
}

/** Une étape par appel réel, dans l'ordre des appels. */
export function etapesDepuisAppels(appels: readonly AppelOutil[]): EtapeChat[] {
  if (!Array.isArray(appels)) throw new ErreurChat('parametre_invalide');
  return appels.map((a) => {
    if (!Number.isSafeInteger(a.dureeMs) || a.dureeMs < 0 || typeof a.outil !== 'string' || a.outil === '') {
      throw new ErreurChat('parametre_invalide');
    }
    return { outil: a.outil, dureeMs: a.dureeMs, etat: a.issue };
  });
}
