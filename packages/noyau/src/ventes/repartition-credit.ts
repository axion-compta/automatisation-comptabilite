// Ventes : répartition d'un crédit bancaire sur plusieurs factures ; le reste est un trop-perçu.
import type { Centimes } from '../argent/index.js';
import { comparerDates, ErreurVente } from './types.js';

export interface FactureARegler {
  id: string;
  resteDu: Centimes;
  dateFacture: string;
}
export interface Affectation {
  factureId: string;
  montant: Centimes;
}

export function repartirCredit(
  credit: Centimes,
  factures: readonly FactureARegler[],
  ordre?: readonly string[],
): { affectations: Affectation[]; reste: Centimes } {
  if (!Number.isSafeInteger(credit) || credit <= 0) throw new ErreurVente('credit_invalide', 'Crédit invalide.');
  for (const fa of factures) {
    if (!Number.isSafeInteger(fa.resteDu) || fa.resteDu < 0) {
      throw new ErreurVente('reste_du_invalide', 'Reste dû invalide.');
    }
  }
  let servies: FactureARegler[];
  if (ordre === undefined) {
    servies = [...factures].sort((a, b) => comparerDates(a.dateFacture, b.dateFacture) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  } else {
    const parId = new Map(factures.map((fa) => [fa.id, fa]));
    if (new Set(ordre).size !== ordre.length || ordre.some((id) => !parId.has(id))) {
      throw new ErreurVente('ordre_invalide', 'Ordre invalide : identifiant inconnu ou en double.');
    }
    servies = ordre.map((id) => parId.get(id) as FactureARegler);
  }
  let reste = credit as number;
  const affectations: Affectation[] = [];
  for (const fa of servies) {
    const montant = Math.min(reste, fa.resteDu);
    if (montant === 0) continue;
    affectations.push({ factureId: fa.id, montant: montant as Centimes });
    reste -= montant;
  }
  return { affectations, reste: reste as Centimes };
}
