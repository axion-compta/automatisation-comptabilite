// Date de l'écriture d'un frais : date de la dépense, ou premier jour de la première période ouverte.
import { estDateValide } from '../dates/civiles.js';
import { ErreurFrais } from './types.js';

export interface PeriodeFrais {
  debut: string;
  fin: string;
  ouverte: boolean;
}

export interface DateEcriture {
  date: string;
  motif?: 'periode_close';
}

const ANNEE_MIN = 1000;
const ANNEE_MAX = 9999;

function refuser(message: string): never {
  throw new ErreurFrais('entree_invalide', message);
}

function trier(periodes: readonly PeriodeFrais[]): PeriodeFrais[] {
  for (const x of periodes) {
    if (!estDateValide(x.debut) || !estDateValide(x.fin) || x.debut > x.fin) refuser('Période invalide');
  }
  const triees = [...periodes].sort((a, b) => (a.debut < b.debut ? -1 : a.debut > b.debut ? 1 : 0));
  triees.forEach((x, i) => {
    const prec = triees[i - 1];
    if (prec !== undefined && x.debut <= prec.fin) refuser('Périodes qui se chevauchent');
  });
  return triees;
}

export function dateEcriture(dateFrais: string, periodes: readonly PeriodeFrais[]): DateEcriture {
  if (!estDateValide(dateFrais)) refuser('Date du frais invalide');
  const triees = trier(periodes);
  const courante = triees.find((x) => x.debut <= dateFrais && dateFrais <= x.fin);
  if (courante?.ouverte === true) return { date: dateFrais };
  const suivante = triees.find((x) => x.ouverte && x.debut > dateFrais);
  if (suivante === undefined) refuser('Aucune période ouverte');
  return { date: suivante.debut, motif: 'periode_close' };
}

export function dateRegularisation(anneeCivile: number, periodes: readonly PeriodeFrais[]): DateEcriture {
  if (!Number.isSafeInteger(anneeCivile) || anneeCivile < ANNEE_MIN || anneeCivile > ANNEE_MAX) {
    refuser('Année civile invalide');
  }
  return dateEcriture(`${anneeCivile}-12-31`, periodes);
}
