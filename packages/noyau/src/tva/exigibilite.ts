// TVA exigible à l'encaissement : méthode cumulative, le dernier paiement solde exactement.
// Aucune division ici : la répartition passe par `repartir` (plus grand reste).
import { repartir, type Centimes } from '../argent/index.js';

export type CodeErreurExigibilite = 'trop_encaisse' | 'montant_invalide' | 'tva_superieure_au_ttc';

export class ErreurExigibilite extends Error {
  override name = 'ErreurExigibilite';
  readonly code: CodeErreurExigibilite;
  constructor(code: CodeErreurExigibilite, message: string) {
    super(message);
    this.code = code;
  }
}

export interface PaiementFacture {
  id: string;
  date: string;
  montant: Centimes;
}

export interface TvaDuTaux {
  cle: string;
  tva: Centimes;
}

export interface EntreeExigibilite {
  ttc: Centimes;
  tvaParTaux: readonly TvaDuTaux[];
  paiements: readonly PaiementFacture[];
}

export interface TvaExigiblePaiement {
  paiementId: string;
  date: string;
  parTaux: { cle: string; tva: Centimes }[];
}

function entierPositifOuNul(valeur: number): boolean {
  return Number.isSafeInteger(valeur) && valeur >= 0;
}

function comparer(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Part de TVA d'un taux rattachée à un montant cumulé encaissé (première part de la répartition). */
function partCumulee(tva: Centimes, cumul: number, ttc: Centimes): number {
  if (cumul === 0 || tva === 0) return 0;
  const [part] = repartir(tva, [cumul, ttc - cumul]);
  return part ?? 0;
}

/** TVA exigible à chaque paiement, par taux. Un paiement ajouté ne change jamais les précédents. */
export function tvaExigible(entree: EntreeExigibilite): TvaExigiblePaiement[] {
  const { ttc, tvaParTaux, paiements } = entree;
  if (!entierPositifOuNul(ttc)) throw new ErreurExigibilite('montant_invalide', 'Le TTC doit être un entier positif ou nul.');
  let totalTva = 0;
  for (const t of tvaParTaux) {
    if (!entierPositifOuNul(t.tva)) throw new ErreurExigibilite('montant_invalide', `TVA invalide pour le taux « ${t.cle} ».`);
    totalTva += t.tva;
  }
  if (totalTva > ttc) throw new ErreurExigibilite('tva_superieure_au_ttc', 'La TVA dépasse le TTC de la facture.');
  for (const p of paiements) {
    if (!Number.isSafeInteger(p.montant) || p.montant <= 0) {
      throw new ErreurExigibilite('montant_invalide', `Montant de paiement invalide : « ${p.id} ».`);
    }
  }

  const tries = [...paiements].sort((a, b) => comparer(a.date, b.date) || comparer(a.id, b.id));
  const precedentes = tvaParTaux.map(() => 0);
  let cumul = 0;
  return tries.map((p) => {
    cumul += p.montant;
    if (cumul > ttc) throw new ErreurExigibilite('trop_encaisse', 'Le total encaissé dépasse le TTC de la facture.');
    const parTaux = tvaParTaux.map((t, i) => {
      const part = partCumulee(t.tva, cumul, ttc);
      const tva = (part - (precedentes[i] ?? 0)) as Centimes;
      precedentes[i] = part;
      return { cle: t.cle, tva };
    });
    return { paiementId: p.id, date: p.date, parTaux };
  });
}
