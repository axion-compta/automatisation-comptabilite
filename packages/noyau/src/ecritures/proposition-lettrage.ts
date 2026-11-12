// Proposition de lettrage (401, 411, 455) et délettrage tracé. Montants en centimes entiers, aucune écriture modifiée.
import { estDateValide } from '../dates/civiles.js';
import type { LigneALettrer } from './lettrage.js';

export interface LigneProposable extends LigneALettrer {
  reference?: string;
}
export interface PropositionLettrage {
  compte: string;
  auxiliaire?: string;
  ligneIds: string[];
  motif: 'reference' | 'montant';
}
export interface GroupeLettre {
  code: string;
  lignes: readonly LigneALettrer[];
}
export interface TraceDelettrage {
  code: string;
  ligneIds: string[];
  motif: string;
  auteur: string;
  date: string;
}
export interface ResultatDelettrageGenerique {
  lignes: LigneALettrer[];
  trace: TraceDelettrage;
}

export class ErreurProposition extends Error {
  override name = 'ErreurProposition';
}

const COMPTES = /^(401|411|455)/;
const entierValide = (n: number): boolean => Number.isSafeInteger(n) && n >= 0;
const net = (x: LigneALettrer): number => x.debit - x.credit;

function proposable(x: LigneProposable): boolean {
  return COMPTES.test(x.compte) && x.lettre === undefined && entierValide(x.debit) && entierValide(x.credit);
}

/** Propose des groupes de solde nul : référence commune d'abord, puis montant égal unique. Un montant ambigu n'est jamais proposé. */
export function proposerLettrages(lignes: readonly LigneProposable[]): PropositionLettrage[] {
  const parCompte = new Map<string, LigneProposable[]>();
  for (const x of lignes) {
    if (!proposable(x)) continue;
    const cle = `${x.compte}\u0001${x.auxiliaire ?? ''}`;
    parCompte.set(cle, [...(parCompte.get(cle) ?? []), x]);
  }
  const propositions: PropositionLettrage[] = [];
  for (const groupe of parCompte.values()) {
    const premiere = groupe[0];
    if (premiere === undefined) continue;
    const base = { compte: premiere.compte, ...(premiere.auxiliaire === undefined ? {} : { auxiliaire: premiere.auxiliaire }) };
    const prises = new Set<string>();
    const parReference = new Map<string, LigneProposable[]>();
    for (const x of groupe) {
      const ref = x.reference?.trim() ?? '';
      if (ref !== '') parReference.set(ref, [...(parReference.get(ref) ?? []), x]);
    }
    for (const membres of parReference.values()) {
      const somme = membres.reduce((s, x) => s + net(x), 0);
      if (membres.length >= 2 && somme === 0 && membres.some((x) => net(x) !== 0)) {
        propositions.push({ ...base, ligneIds: membres.map((x) => x.id), motif: 'reference' });
        for (const x of membres) prises.add(x.id);
      }
    }
    const debits = new Map<number, LigneProposable[]>();
    const credits = new Map<number, LigneProposable[]>();
    for (const x of groupe) {
      const n = net(x);
      if (prises.has(x.id) || n === 0) continue;
      const table = n > 0 ? debits : credits;
      table.set(Math.abs(n), [...(table.get(Math.abs(n)) ?? []), x]);
    }
    for (const [montant, d] of debits) {
      const c = credits.get(montant);
      const seul = d[0];
      const autre = c?.[0];
      if (d.length === 1 && c?.length === 1 && seul !== undefined && autre !== undefined) {
        propositions.push({ ...base, ligneIds: [seul.id, autre.id], motif: 'montant' });
      }
    }
  }
  return propositions;
}

const vide = (t: unknown): boolean => typeof t !== 'string' || t.trim() === '';

/** Rend les lignes non lettrées et la trace (qui, quand, pourquoi). Motif, auteur et date sont obligatoires. */
export function delettrer(groupe: GroupeLettre, motif: string, auteur: string, date: string): ResultatDelettrageGenerique {
  if (vide(motif)) throw new ErreurProposition('Un motif est obligatoire pour délettrer.');
  if (vide(auteur)) throw new ErreurProposition("L'auteur du délettrage est obligatoire.");
  if (typeof date !== 'string' || !estDateValide(date)) throw new ErreurProposition('La date du délettrage doit être AAAA-MM-JJ.');
  if (groupe.lignes.length === 0) throw new ErreurProposition('Aucune ligne à délettrer.');
  if (groupe.lignes.some((x) => x.lettre !== groupe.code)) throw new ErreurProposition("Une ligne n'est pas lettrée sous ce code.");
  const rendues = groupe.lignes.map((x): LigneALettrer => {
    const copie = { ...x };
    delete copie.lettre;
    return copie;
  });
  return {
    lignes: rendues,
    trace: { code: groupe.code, ligneIds: groupe.lignes.map((x) => x.id), motif: motif.trim(), auteur: auteur.trim(), date },
  };
}
