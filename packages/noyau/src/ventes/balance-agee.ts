// Balance âgée des clients : tranches en argument, classement sans division.
import { type Centimes, ajouter, soustraire } from '../argent/index.js';
import { ErreurVente, ajouterJours, comparerDates } from './types.js';

export interface CreanceClient {
  readonly factureId: string;
  readonly clientId: string;
  readonly resteDu: Centimes;
  readonly echeance?: string;
  readonly dateFacture: string;
}

export interface Tranche {
  de: number;
  a: number | null;
  total: Centimes;
  factureIds: string[];
}

export interface EntreeBalanceAgee {
  readonly creances: readonly CreanceClient[];
  readonly dateReference: string;
  readonly bornesJours: readonly number[];
  readonly solde411: Centimes;
}

export interface ResultatBalanceAgee {
  nonEchue: Tranche;
  tranches: Tranche[];
  total: Centimes;
  ecart: Centimes;
  alerte?: 'A19';
}

function exigerBornes(bornes: readonly number[]): void {
  const ok =
    Array.isArray(bornes) &&
    bornes.length > 0 &&
    bornes.every((b, i) => Number.isSafeInteger(b) && b > 0 && (i === 0 || b > (bornes[i - 1] as number)));
  if (!ok) throw new ErreurVente('bornes_invalides', 'Bornes en jours : entiers positifs strictement croissants.');
}

function tranche(de: number, a: number | null): Tranche {
  return { de, a, total: 0 as Centimes, factureIds: [] };
}

function poser(t: Tranche, c: CreanceClient): void {
  t.total = ajouter(t.total, c.resteDu);
  t.factureIds.push(c.factureId);
}

export function balanceAgee(entree: EntreeBalanceAgee): ResultatBalanceAgee {
  const { bornesJours: bornes, dateReference } = entree;
  exigerBornes(bornes);
  const nonEchue = tranche(0, 0);
  const tranches = [...bornes.map((b, i) => tranche(i === 0 ? 1 : (bornes[i - 1] as number) + 1, b)), tranche((bornes[bornes.length - 1] as number) + 1, null)];
  const triees = [...entree.creances].sort((x, y) => (x.factureId < y.factureId ? -1 : x.factureId > y.factureId ? 1 : 0));
  for (const c of triees) {
    if (!Number.isSafeInteger(c.resteDu)) throw new ErreurVente('reste_du_invalide', 'Reste dû : entier de centimes attendu.');
    if (c.resteDu === 0) continue;
    const base = c.echeance ?? c.dateFacture;
    if (comparerDates(dateReference, base) <= 0) {
      poser(nonEchue, c);
      continue;
    }
    const i = bornes.findIndex((b) => comparerDates(dateReference, ajouterJours(base, b)) <= 0);
    poser(tranches[i === -1 ? bornes.length : i] as Tranche, c);
  }
  const total = [nonEchue, ...tranches].reduce((s, t) => ajouter(s, t.total), 0 as Centimes);
  const ecart = soustraire(total, entree.solde411);
  return ecart === 0 ? { nonEchue, tranches, total, ecart } : { nonEchue, tranches, total, ecart, alerte: 'A19' };
}
