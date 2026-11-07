// Identité FEC = grand livre = balance, au centime. Une seule vérité : `balance()` et `grandLivre()`.
// Un total qui dépasse l'entier sûr lève `ErreurArgent` (propagée telle quelle).
import { type Centimes, ajouter, centimes, soustraire } from '../argent/index.js';
import type { Ecriture } from '../ecritures/modele.js';
import { balance, grandLivre } from '../livres/balance.js';
import type { EcartFec, LigneFecLue, RegleFec } from './controles-structure.js';
import { lireMontantFec } from './format.js';

export const REGLES_IDENTITE: readonly RegleFec[] = [
  { id: 'FEC-I01', libelle: 'Total différent entre FEC et balance pour un compte', gravite: 'B', source: 'a_sourcer', testId: 'un-centime-sur-un-compte-fec-i01' },
  { id: 'FEC-I02', libelle: "Compte présent d'un seul côté", gravite: 'B', source: 'a_sourcer', testId: 'compte-absent-du-fec-fec-i02' },
  { id: 'FEC-I03', libelle: 'Solde final du grand livre différent de la balance', gravite: 'B', source: 'a_sourcer', testId: 'grand-livre-coherent-fec-i03' },
];

interface Totaux {
  ligne: number;
  debit: Centimes;
  credit: Centimes;
}

export function controlerIdentite(lignes: readonly LigneFecLue[], ecritures: readonly Ecriture[]): EcartFec[] {
  const fec = new Map<string, Totaux>();
  for (const l of lignes) {
    const t = fec.get(l.valeurs.compteNum) ?? { ligne: l.numero, debit: centimes(0), credit: centimes(0) };
    t.ligne = Math.min(t.ligne, l.numero);
    t.debit = ajouter(t.debit, lireMontantFec(l.valeurs.debit));
    t.credit = ajouter(t.credit, lireMontantFec(l.valeurs.credit));
    fec.set(l.valeurs.compteNum, t);
  }
  const ecarts: EcartFec[] = [];
  const lignesBalance = balance(ecritures).lignes;
  for (const b of lignesBalance) {
    const t = fec.get(b.compte);
    if (t === undefined) {
      ecarts.push({ regleId: 'FEC-I02', ligne: 1, champ: 'compteNum', valeur: b.compte, ecartCentimes: soustraire(centimes(0), b.solde) });
    } else if (t.debit !== b.totalDebit || t.credit !== b.totalCredit) {
      ecarts.push({ regleId: 'FEC-I01', ligne: t.ligne, champ: 'compteNum', valeur: b.compte, ecartCentimes: soustraire(soustraire(t.debit, t.credit), b.solde) });
    }
    const dernier = grandLivre(ecritures, b.compte).at(-1);
    const cumul = dernier === undefined ? centimes(0) : dernier.cumul;
    if (cumul !== b.solde) {
      ecarts.push({ regleId: 'FEC-I03', ligne: 1, champ: 'compteNum', valeur: b.compte, ecartCentimes: soustraire(cumul, b.solde) });
    }
  }
  const connus = new Set(lignesBalance.map((b) => b.compte));
  for (const [compte, t] of [...fec].sort(([a], [b]) => (a < b ? -1 : 1))) {
    if (!connus.has(compte)) {
      ecarts.push({ regleId: 'FEC-I02', ligne: t.ligne, champ: 'compteNum', valeur: compte, ecartCentimes: soustraire(t.debit, t.credit) });
    }
  }
  return ecarts;
}
