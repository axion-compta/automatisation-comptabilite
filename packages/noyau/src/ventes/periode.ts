// Ventes : rangement d'une facture sur une période. Jamais de modification d'une période verrouillée ou déposée.
import { estVerrouillee, periodeDe, periodesMensuelles, type Exercice } from '../exercices/exercices.js';
import { ErreurVente, comparerDates, exigerDate } from './types.js';

export type CarteRangement = 'A9' | 'A11' | 'annee_close';

export interface DemandeRangement {
  dateFacture: string;
  exercices: Exercice[];
  periodesVerrouillees: string[];
  dateImmatriculation?: string;
}

export interface ResultatRangement {
  periode: string | null;
  cartes: CarteRangement[];
}

const LONGUEUR_CLE = 7;

function exigerListe(v: unknown, champ: string): asserts v is string[] {
  if (!Array.isArray(v) || v.some((x) => typeof x !== 'string')) {
    throw new ErreurVente('entree_invalide', `Liste invalide pour ${champ}.`);
  }
}

export function rangerFacture(d: DemandeRangement): ResultatRangement {
  exigerDate(d.dateFacture, 'dateFacture');
  if (d.dateImmatriculation !== undefined) exigerDate(d.dateImmatriculation, 'dateImmatriculation');
  if (!Array.isArray(d.exercices)) throw new ErreurVente('entree_invalide', 'Liste invalide pour exercices.');
  exigerListe(d.periodesVerrouillees, 'periodesVerrouillees');
  for (const e of d.exercices) {
    exigerDate(e.debut, 'debut');
    exigerDate(e.fin, 'fin');
  }
  const cartes: CarteRangement[] = [];
  const avantImmat = d.dateImmatriculation !== undefined && comparerDates(d.dateFacture, d.dateImmatriculation) < 0;
  const etat = { periodesVerrouillees: d.periodesVerrouillees, exerciceCloture: false };
  const cle = d.dateFacture.slice(0, LONGUEUR_CLE);
  const trouve = d.exercices.some((e) => periodeDe(d.dateFacture, e) !== undefined);
  let periode: string | null = null;
  if (!trouve) {
    cartes.push('A9');
  } else if (!estVerrouillee(d.dateFacture, etat)) {
    periode = cle;
  } else {
    const suivantes = d.exercices
      .filter((e) => comparerDates(e.debut, e.fin) <= 0)
      .flatMap((e) => periodesMensuelles(e))
      .filter((p) => p.cle > cle && !estVerrouillee(p.debut, etat))
      .map((p) => p.cle)
      .sort();
    periode = suivantes[0] ?? null;
    cartes.push('annee_close');
  }
  if (avantImmat) cartes.push('A11');
  return { periode, cartes };
}

export function periodeDeTva(d: { dateExigibilite: string | null; periodesDeposees: string[] }): {
  periode: string;
  aDeclarerSurPeriodeOuverte: boolean;
} {
  if (d.dateExigibilite === null) throw new ErreurVente('exigibilite_inconnue', 'Date d’exigibilité inconnue.');
  exigerDate(d.dateExigibilite, 'dateExigibilite');
  exigerListe(d.periodesDeposees, 'periodesDeposees');
  const periode = d.dateExigibilite.slice(0, LONGUEUR_CLE);
  return { periode, aDeclarerSurPeriodeOuverte: d.periodesDeposees.includes(periode) };
}
