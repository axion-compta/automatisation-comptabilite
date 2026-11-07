// Budget de l'IA : coût estimé avant l'appel, plafond par tour, appels par événement. Micro-centimes entiers.
import { ErreurChat, microCentimes, type MicroCentimes } from './types.js';

export type EntreeEstimation = {
  jetonsEntree: number;
  plafondJetonsSortie: number;
  tarifEntree: number;
  tarifSortie: number;
};

export type DecisionAppel = { permis: true } | { permis: false; code: 'budget_tour_atteint' };
export type DecisionEvenement = { permis: true } | { permis: false; rapport: 'incomplet' };

function entierSur(n: unknown): number {
  if (typeof n !== 'number' || !Number.isSafeInteger(n) || n < 0) throw new ErreurChat('parametre_invalide');
  return n;
}

function somme(a: number, b: number): number {
  return entierSur(a + b);
}

export function estimerCout(e: EntreeEstimation): MicroCentimes {
  const entree = entierSur(entierSur(e.jetonsEntree) * entierSur(e.tarifEntree));
  const sortie = entierSur(entierSur(e.plafondJetonsSortie) * entierSur(e.tarifSortie));
  return microCentimes(somme(entree, sortie));
}

export function autoriserAppel(p: {
  depense: MicroCentimes;
  estimation: MicroCentimes;
  plafond: MicroCentimes | undefined;
}): DecisionAppel {
  if (p.plafond === undefined) return { permis: false, code: 'budget_tour_atteint' };
  const total = somme(entierSur(p.depense), entierSur(p.estimation));
  return total <= entierSur(p.plafond) ? { permis: true } : { permis: false, code: 'budget_tour_atteint' };
}

export function ajouterCoutReel(depense: MicroCentimes, reel: number): MicroCentimes {
  return microCentimes(somme(entierSur(depense), entierSur(reel)));
}

export function autoriserAppelEvenement(appelsFaits: number, maxAppels: number): DecisionEvenement {
  return entierSur(appelsFaits) < entierSur(maxAppels) ? { permis: true } : { permis: false, rapport: 'incomplet' };
}
