// Types et codes communs du lot 15 (interface transverse). Codes seulement : aucun texte affiché.

export type EtatBloc = 'ok' | 'a_faire' | 'a_verifier' | 'impossible' | 'vide';

export type CodeBloc =
  | 'tresorerie'
  | 'argent_entrant_sortant'
  | 'resultat'
  | 'creances_dettes'
  | 'tva_impots'
  | 'comptes_associes'
  | 'transactions'
  | 'a_faire';

export type Vue = 'mois' | 'exercice' | 'depuis_debut';

/** Bornes incluses, au format AAAA-MM-JJ. */
export interface Periode {
  debut: string;
  fin: string;
}

export type GraviteAlerte = 'info' | 'a_faire' | 'urgent' | 'bloquant';

export type EtatAlerte = 'ouverte' | 'reportee' | 'ignoree' | 'resolue_auto' | 'resolue';

export type CauseJournal =
  | 'evaluation'
  | 'evenement'
  | 'clic'
  | 'report'
  | 'ignorer'
  | 'annulation'
  | 'fermeture_auto';

export type Couleur = 'vert' | 'orange' | 'rouge';

export const CODES_BLOC: readonly CodeBloc[] = Object.freeze([
  'tresorerie',
  'argent_entrant_sortant',
  'resultat',
  'creances_dettes',
  'tva_impots',
  'comptes_associes',
  'transactions',
  'a_faire',
] as const);

/** Ordre croissant de gravité. */
export const GRAVITES: readonly GraviteAlerte[] = Object.freeze([
  'info',
  'a_faire',
  'urgent',
  'bloquant',
] as const);

export const ETATS_ALERTE_ACTIFS: readonly EtatAlerte[] = Object.freeze(['ouverte', 'reportee'] as const);

const VUES: readonly Vue[] = Object.freeze(['mois', 'exercice', 'depuis_debut'] as const);

/** Rang de 0 (info) à 3 (bloquant). */
export function rangGravite(g: GraviteAlerte): number {
  return GRAVITES.indexOf(g);
}

export function graviteMax(a: GraviteAlerte, b: GraviteAlerte): GraviteAlerte {
  return rangGravite(a) >= rangGravite(b) ? a : b;
}

export function estGravite(x: unknown): x is GraviteAlerte {
  return typeof x === 'string' && (GRAVITES as readonly string[]).includes(x);
}

export function estCodeBloc(x: unknown): x is CodeBloc {
  return typeof x === 'string' && (CODES_BLOC as readonly string[]).includes(x);
}

export function estVue(x: unknown): x is Vue {
  return typeof x === 'string' && (VUES as readonly string[]).includes(x);
}
