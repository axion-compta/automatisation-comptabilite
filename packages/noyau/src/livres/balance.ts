// Balance, grand livre et journal des écritures validées (montants en centimes).
import { ajouter, centimes, soustraire, type Centimes } from '../argent/index.js';
import type { Ecriture } from '../ecritures/modele.js';

export interface LigneBalance {
  compte: string;
  totalDebit: Centimes;
  totalCredit: Centimes;
  solde: Centimes;
}

export interface Balance {
  lignes: LigneBalance[];
  totaux: { debit: Centimes; credit: Centimes };
}

export interface LigneGrandLivre {
  date: string;
  numero: string;
  ecritureId: string;
  journal: string;
  libelle: string;
  debit: Centimes;
  credit: Centimes;
  cumul: Centimes;
}

function cle(e: Ecriture): string {
  return e.numero ?? e.id;
}

function comparer(a: string, b: string): number {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

function parDateNumero(a: Ecriture, b: Ecriture): number {
  return comparer(a.date, b.date) || comparer(cle(a), cle(b));
}

/** Seules les écritures validées entrent dans un état officiel (contre-passées et contre-passations comprises). */
function validees(ecritures: readonly Ecriture[]): Ecriture[] {
  return ecritures.filter((e) => e.statut === 'valide');
}

export function balance(ecritures: readonly Ecriture[]): Balance {
  const parCompte = new Map<string, { debit: Centimes; credit: Centimes }>();
  let debit = centimes(0);
  let credit = centimes(0);
  for (const e of validees(ecritures)) {
    for (const l of e.lignes) {
      const c = parCompte.get(l.compte) ?? { debit: centimes(0), credit: centimes(0) };
      c.debit = ajouter(c.debit, l.debit);
      c.credit = ajouter(c.credit, l.credit);
      parCompte.set(l.compte, c);
      debit = ajouter(debit, l.debit);
      credit = ajouter(credit, l.credit);
    }
  }
  const lignes = [...parCompte.entries()]
    .sort(([a], [b]) => comparer(a, b))
    .map(([compte, c]) => ({
      compte,
      totalDebit: c.debit,
      totalCredit: c.credit,
      solde: soustraire(c.debit, c.credit),
    }));
  return { lignes, totaux: { debit, credit } };
}

export function grandLivre(ecritures: readonly Ecriture[], compte: string): LigneGrandLivre[] {
  const triees = validees(ecritures).sort(parDateNumero);
  const sortie: LigneGrandLivre[] = [];
  let cumul = centimes(0);
  for (const e of triees) {
    for (const l of e.lignes) {
      if (l.compte !== compte) continue;
      cumul = ajouter(cumul, soustraire(l.debit, l.credit));
      sortie.push({
        date: e.date,
        numero: e.numero ?? '',
        ecritureId: e.id,
        journal: e.journal,
        libelle: l.libelle,
        debit: l.debit,
        credit: l.credit,
        cumul,
      });
    }
  }
  return sortie;
}

export function journal(ecritures: readonly Ecriture[], codeJournal: string): Ecriture[] {
  return validees(ecritures)
    .filter((e) => e.journal === codeJournal)
    .sort((a, b) => comparer(cle(a), cle(b)))
    .map((e) => ({ ...e, lignes: e.lignes.map((l) => ({ ...l })) }));
}
