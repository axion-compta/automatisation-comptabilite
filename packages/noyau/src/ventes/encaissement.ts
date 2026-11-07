// Ventes, cas B : TVA et base exigibles au prorata des encaissements ; le dernier paiement solde.
import { repartir, type Centimes } from '../argent/index.js';
import { ErreurVente } from './types.js';

export interface TauxEncaisse {
  tauxPdb: number;
  tvaInitiale: Centimes;
  baseInitiale: Centimes;
  tvaDejaExigible: Centimes;
  baseDejaExigible: Centimes;
}
export interface PartEncaissee {
  parTaux: { tauxPdb: number; tva: Centimes; base: Centimes }[];
  dernier: boolean;
  tropPercu: Centimes;
}

const entierPositif = (n: number): boolean => Number.isSafeInteger(n) && n > 0;
const entierPositifOuNul = (n: number): boolean => Number.isSafeInteger(n) && n >= 0;

// Part du montant exigible pour ce paiement, plafonnée au reste en attente.
function part(initial: Centimes, deja: Centimes, dernier: boolean, p: number, ttc: number): Centimes {
  const reste = initial - deja;
  if (dernier) return reste as Centimes;
  const arrondie = repartir(initial, [p, ttc - p])[0] ?? 0;
  return Math.min(arrondie, reste) as Centimes;
}

export function partEncaissee(e: {
  ttcFacture: Centimes;
  dejaEncaisse: Centimes;
  paiement: Centimes;
  parTaux: readonly TauxEncaisse[];
}): PartEncaissee {
  if (!entierPositif(e.ttcFacture)) throw new ErreurVente('ttc_invalide', 'TTC de la facture invalide.');
  if (!entierPositif(e.paiement)) throw new ErreurVente('paiement_invalide', 'Paiement invalide.');
  if (!entierPositifOuNul(e.dejaEncaisse)) {
    throw new ErreurVente('deja_encaisse_invalide', 'Montant déjà encaissé invalide.');
  }
  if (e.dejaEncaisse >= e.ttcFacture) throw new ErreurVente('deja_solde', 'Facture déjà soldée.');
  for (const t of e.parTaux) {
    const coherent =
      entierPositifOuNul(t.tvaDejaExigible) &&
      entierPositifOuNul(t.baseDejaExigible) &&
      entierPositifOuNul(t.tvaInitiale) &&
      entierPositifOuNul(t.baseInitiale) &&
      t.tvaDejaExigible <= t.tvaInitiale &&
      t.baseDejaExigible <= t.baseInitiale;
    if (!coherent) throw new ErreurVente('deja_exigible_incoherent', 'Part déjà exigible incohérente.');
  }
  const cumul = e.dejaEncaisse + e.paiement;
  const dernier = cumul >= e.ttcFacture;
  return {
    parTaux: e.parTaux.map((t) => ({
      tauxPdb: t.tauxPdb,
      tva: part(t.tvaInitiale, t.tvaDejaExigible, dernier, e.paiement, e.ttcFacture),
      base: part(t.baseInitiale, t.baseDejaExigible, dernier, e.paiement, e.ttcFacture),
    })),
    dernier,
    tropPercu: (dernier ? cumul - e.ttcFacture : 0) as Centimes,
  };
}
