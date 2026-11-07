// Contrôle CC-K11 : date de la pièce. Dates AAAA-MM-JJ, aucun texte affiché : seulement des codes.
import { estVerrouillee, periodeDe, periodesMensuelles } from '../../exercices/exercices.js';
import type { EtatVerrou, Exercice } from '../../exercices/exercices.js';
import type { Declencheur, RegleControle, SortieRegle } from '../moteur.js';
import { alerte, ErreurControle, ok } from './commun.js';

export interface ObjetDatePiece {
  datePiece: string;
  dateLecture: string;
  exercice: Exercice;
  verrou: EtatVerrou;
  dateArrete?: string;
  dateImmatriculation?: string;
}

export type QualificationDate =
  | 'ok'
  | 'periode_close'
  | 'hors_exercice'
  | 'future'
  | 'apres_arrete'
  | 'avant_immatriculation';

function exigerDate(s: string): void {
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(s);
  const [a, mo, j] = [Number(m?.[1]), Number(m?.[2]), Number(m?.[3])];
  const d = new Date(Date.UTC(a, mo - 1, j));
  if (m === null || d.getUTCFullYear() !== a || d.getUTCMonth() !== mo - 1 || d.getUTCDate() !== j) {
    throw new ErreurControle('entree_invalide');
  }
}

export function qualifierDate(o: ObjetDatePiece): QualificationDate {
  for (const d of [o.datePiece, o.dateLecture, o.exercice.debut, o.exercice.fin, o.dateArrete, o.dateImmatriculation]) {
    if (d !== undefined) exigerDate(d);
  }
  const dansExercice = periodeDe(o.datePiece, o.exercice) !== undefined;
  if (dansExercice && estVerrouillee(o.datePiece, o.verrou)) return 'periode_close';
  if (o.datePiece > o.dateLecture) return 'future';
  if (!dansExercice) return 'hors_exercice';
  if (o.dateArrete !== undefined && o.datePiece > o.dateArrete) return 'apres_arrete';
  if (o.dateImmatriculation !== undefined && o.datePiece < o.dateImmatriculation) return 'avant_immatriculation';
  return 'ok';
}

/** Premier jour d'une période non verrouillée de l'exercice, ou null. */
export function premierJourOuvert(o: ObjetDatePiece): string | null {
  return periodesMensuelles(o.exercice).find((p) => !estVerrouillee(p.debut, o.verrou))?.debut ?? null;
}

const DECLENCHEURS: Declencheur[] = ['arrivee', 'continu', 'a_la_demande'];

export const regleCCK11: RegleControle<ObjetDatePiece> = {
  id: 'CC-K11',
  version: 1,
  gravite: 'B',
  bloque: ['validation', 'cloture'],
  declencheurs: DECLENCHEURS,
  actif: true,
  evaluer: (o): SortieRegle =>
    qualifierDate(o) === 'periode_close' ? alerte(undefined, premierJourOuvert(o) ?? 'aucune_periode_ouverte') : ok(),
};

export const regleCCK11M: RegleControle<ObjetDatePiece> = {
  id: 'CC-K11M',
  version: 1,
  gravite: 'M',
  bloque: [],
  declencheurs: DECLENCHEURS,
  actif: true,
  evaluer: (o): SortieRegle => {
    const q = qualifierDate(o);
    return q === 'ok' || q === 'periode_close' ? ok() : alerte(undefined, q);
  },
};
