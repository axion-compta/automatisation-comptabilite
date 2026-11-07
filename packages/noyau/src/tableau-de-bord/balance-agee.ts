// Balance âgée du bloc creances_dettes (TB-R5). Centimes entiers, aucune division ; bornes et nombre de retards en arguments.
import { ajouter, centimes, type Centimes } from '../argent/index.js';
import { ajouterJours, comparerDates } from '../dates/civiles.js';

export interface Facture {
  id: string;
  tiersCode: string;
  sens: 'a_recevoir' | 'a_payer';
  resteCentimes: Centimes;
  echeance: string;
}

export interface Tranche {
  totalCentimes: Centimes;
  nombre: number;
}
export interface BalanceSens {
  tranches: Tranche[];
  totalCentimes: Centimes;
}
export type BalanceAgee = Record<Facture['sens'], BalanceSens>;

function verifierBornes(bornes: readonly number[]): void {
  const ok =
    bornes.length > 0 && bornes.every((b, i) => Number.isSafeInteger(b) && b > 0 && (i === 0 || b > (bornes[i - 1] as number)));
  if (!ok) throw new Error('bornes_invalides');
}

// Index de tranche : 0 = non échu, k = retard dans (borne k-1, borne k], dernier = au-delà de la dernière borne.
// Comparaison de dates seulement : retard > b  <=>  jour > échéance + b.
function indexTranche(f: Facture, jour: string, bornes: readonly number[]): number {
  if (comparerDates(jour, f.echeance) <= 0) return 0;
  const franchies = bornes.filter((b) => comparerDates(jour, ajouterJours(f.echeance, b)) > 0).length;
  return 1 + franchies;
}

function verifierReste(f: Facture): void {
  if (!Number.isSafeInteger(f.resteCentimes) || f.resteCentimes < 0) throw new Error('reste_invalide');
}

export function balanceAgee(factures: readonly Facture[], jour: string, bornes: readonly number[]): BalanceAgee {
  verifierBornes(bornes);
  const vide = (): BalanceSens => ({
    tranches: Array.from({ length: bornes.length + 2 }, () => ({ totalCentimes: centimes(0), nombre: 0 })),
    totalCentimes: centimes(0),
  });
  const res: BalanceAgee = { a_recevoir: vide(), a_payer: vide() };
  const attendu = { a_recevoir: centimes(0), a_payer: centimes(0) };
  for (const f of factures) {
    verifierReste(f);
    if (f.resteCentimes === 0) continue;
    const t = res[f.sens].tranches[indexTranche(f, jour, bornes)] as Tranche;
    t.totalCentimes = ajouter(t.totalCentimes, f.resteCentimes);
    t.nombre += 1;
    attendu[f.sens] = ajouter(attendu[f.sens], f.resteCentimes);
  }
  for (const sens of ['a_recevoir', 'a_payer'] as const) {
    const somme = res[sens].tranches.reduce((s, t) => ajouter(s, t.totalCentimes), centimes(0));
    if (somme !== attendu[sens]) throw new Error('incoherence');
    res[sens].totalCentimes = somme;
  }
  return res;
}

export function plusGrosRetards(factures: readonly Facture[], jour: string, n: number): Facture[] {
  if (!Number.isSafeInteger(n) || n < 0) throw new Error('n_invalide');
  return factures
    .filter((f) => {
      verifierReste(f);
      return f.resteCentimes > 0 && comparerDates(jour, f.echeance) > 0;
    })
    .sort(
      (a, b) =>
        b.resteCentimes - a.resteCentimes || comparerDates(a.echeance, b.echeance) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    )
    .slice(0, n);
}
