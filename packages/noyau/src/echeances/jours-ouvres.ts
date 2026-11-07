// Jours ouvrés et report d'une date limite. Le calendrier (jours non ouvrés, fériés) est un argument.
import { ajouterJours, estDateValide, jourDeSemaine } from '../dates/civiles.js';

export class ErreurCalendrier extends Error {
  override name = 'ErreurCalendrier';
  readonly code: 'calendrier_vide' | 'jour_invalide' | 'ferie_invalide' | 'regle_invalide';
  constructor(code: ErreurCalendrier['code']) {
    super(code);
    this.code = code;
  }
}

export interface Calendrier {
  /** 1 = lundi … 7 = dimanche. */
  joursNonOuvres: readonly number[];
  /** AAAA-MM-JJ ; les doublons sont acceptés. */
  feries: readonly string[];
}

export type RegleReport = 'suivant' | 'precedent' | 'aucun';

const BORNE_RECHERCHE = 366;

function verifier(calendrier: Calendrier): void {
  for (const j of calendrier.joursNonOuvres) {
    if (!Number.isInteger(j) || j < 1 || j > 7) throw new ErreurCalendrier('jour_invalide');
  }
  for (const f of calendrier.feries) {
    if (!estDateValide(f)) throw new ErreurCalendrier('ferie_invalide');
  }
  if (new Set(calendrier.joursNonOuvres).size === 7) throw new ErreurCalendrier('calendrier_vide');
}

function ouvre(date: string, calendrier: Calendrier): boolean {
  return !calendrier.joursNonOuvres.includes(jourDeSemaine(date)) && !calendrier.feries.includes(date);
}

export function estJourOuvre(date: string, calendrier: Calendrier): boolean {
  verifier(calendrier);
  return ouvre(date, calendrier);
}

export function reporter(date: string, regle: RegleReport, calendrier: Calendrier): string {
  verifier(calendrier);
  if (regle !== 'suivant' && regle !== 'precedent' && regle !== 'aucun') throw new ErreurCalendrier('regle_invalide');
  if (regle === 'aucun') {
    jourDeSemaine(date);
    return date;
  }
  const pas = regle === 'suivant' ? 1 : -1;
  let courant = date;
  for (let i = 0; i <= BORNE_RECHERCHE; i += 1) {
    if (ouvre(courant, calendrier)) return courant;
    courant = ajouterJours(courant, pas);
  }
  throw new ErreurCalendrier('calendrier_vide');
}
