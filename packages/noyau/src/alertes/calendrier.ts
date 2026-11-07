// Calendrier d'échéances (CA-R1, D31) : aucune date inventée, paramètre non validé rendu « à vérifier » avec sa source.
import { comparerDates } from '../interface/dates.js';
import type { Constat } from './moteur.js';

/** Même liste de statuts que le paquet des paramètres : le noyau ne l'importe pas. */
export type StatutParametre = 'non_verifie' | 'a_verifier' | 'valide' | 'retire';
export type TypeEcheance = 'tva' | 'acompte_is' | 'liasse' | 'cfe' | 'autre';
export type StatutEcheance = 'a_venir' | 'faite' | 'en_retard' | 'inconnue';

export interface EntreeEcheance {
  id: string;
  societeId: string;
  exerciceId: string;
  type: TypeEcheance;
  dateLimite?: string;
  statutParametre?: StatutParametre;
  sourceUrl?: string;
  faite: boolean;
}

export interface FiltreCalendrier {
  societeId: string;
  exerciceId: string;
  du: string;
  au: string;
  jour: string;
}

export interface LigneEcheance {
  id: string;
  type: TypeEcheance;
  dateLimite?: string;
  statut: StatutEcheance;
  aVerifier: boolean;
  sourceUrl?: string;
}

export class ErreurCalendrier extends Error {
  readonly code: 'ordre_inverse' | 'source_absente';
  constructor(code: 'ordre_inverse' | 'source_absente') {
    super(code);
    this.name = 'ErreurCalendrier';
    this.code = code;
  }
}

function statutDe(en: EntreeEcheance, jour: string): StatutEcheance {
  if (en.faite) return 'faite';
  if (en.dateLimite === undefined) return 'inconnue';
  return comparerDates(jour, en.dateLimite) > 0 ? 'en_retard' : 'a_venir';
}

function ligne(en: EntreeEcheance, jour: string): LigneEcheance {
  const aVerifier = en.statutParametre !== undefined && en.statutParametre !== 'valide';
  if (aVerifier && (en.sourceUrl === undefined || en.sourceUrl === '')) throw new ErreurCalendrier('source_absente');
  const l: LigneEcheance = { id: en.id, type: en.type, statut: statutDe(en, jour), aVerifier };
  if (en.dateLimite !== undefined) l.dateLimite = en.dateLimite;
  if (en.sourceUrl !== undefined) l.sourceUrl = en.sourceUrl;
  return l;
}

function comparer(a: LigneEcheance, b: LigneEcheance): number {
  if (a.dateLimite !== undefined && b.dateLimite !== undefined) {
    const c = comparerDates(a.dateLimite, b.dateLimite);
    if (c !== 0) return c;
  } else if (a.dateLimite !== b.dateLimite) {
    return a.dateLimite === undefined ? 1 : -1;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function calendrier(entrees: readonly EntreeEcheance[], f: FiltreCalendrier): LigneEcheance[] {
  if (comparerDates(f.du, f.au) > 0) throw new ErreurCalendrier('ordre_inverse');
  const lignes: LigneEcheance[] = [];
  for (const en of entrees) {
    if (en.societeId !== f.societeId || en.exerciceId !== f.exerciceId) continue;
    if (en.dateLimite !== undefined && (comparerDates(en.dateLimite, f.du) < 0 || comparerDates(en.dateLimite, f.au) > 0)) continue;
    lignes.push(ligne(en, f.jour));
  }
  return lignes.sort(comparer);
}

export function constatsDateIntrouvable(lignes: readonly LigneEcheance[]): Constat[] {
  return lignes.filter((l) => l.statut === 'inconnue').map((l) => ({ regle: 'ECH-INTROUVABLE', objetType: 'echeance', objetId: l.id, gravite: 'a_faire' as const }));
}
