// CC-K13 : paiements sans pièce, distincts des « à qualifier » (type inconnu).
// LA seule fonction de comptage est compterPaiementsSansPiece (réutilisée par la santé).
import { ajouter, centimes, type Centimes } from '../../argent/index.js';
import type { Declencheur, RegleControle } from '../moteur.js';
import { alerte, ErreurControle, ok } from './commun.js';

export const TYPES_DEBIT = ['achat', 'virement_interne', 'emprunt', 'impot', 'inconnu'] as const;
export const QUALIFICATIONS = ['personnel', 'pas_de_piece_necessaire'] as const;

export interface DebitBancaire {
  id: string;
  montant: Centimes;
  type: (typeof TYPES_DEBIT)[number];
  rapproche: boolean;
  qualification?: (typeof QUALIFICATIONS)[number];
}

export interface GroupeDebits {
  nombre: number;
  total: Centimes;
  ids: string[];
}

export interface ComptagePaiements {
  sansPiece: GroupeDebits;
  aQualifier: GroupeDebits;
}

const DECLENCHEURS: Declencheur[] = ['continu', 'nocturne', 'avant_cloture', 'a_la_demande'];

function groupe(debits: readonly DebitBancaire[]): GroupeDebits {
  let total = centimes(0);
  for (const d of debits) total = ajouter(total, d.montant);
  return { nombre: debits.length, total, ids: debits.map((d) => d.id).sort() };
}

function verifier(d: DebitBancaire): void {
  const montantOk = Number.isSafeInteger(d.montant) && d.montant >= 0;
  const typeOk = TYPES_DEBIT.includes(d.type);
  const qualifOk = d.qualification === undefined || QUALIFICATIONS.includes(d.qualification);
  if (!montantOk || !typeOk || !qualifOk) throw new ErreurControle('entree_invalide');
}

export function compterPaiementsSansPiece(debits: readonly DebitBancaire[]): ComptagePaiements {
  debits.forEach(verifier);
  const nonRapproches = debits.filter((d) => !d.rapproche);
  const sansPiece = nonRapproches.filter((d) => d.type === 'achat' && d.qualification === undefined);
  const aQualifier = nonRapproches.filter((d) => d.type === 'inconnu');
  return { sansPiece: groupe(sansPiece), aQualifier: groupe(aQualifier) };
}

export const regleCCK13: RegleControle<readonly DebitBancaire[]> = {
  id: 'CC-K13',
  version: 1,
  gravite: 'M',
  bloque: [],
  declencheurs: DECLENCHEURS,
  actif: true,
  evaluer: (debits) => {
    const { nombre, total } = compterPaiementsSansPiece(debits).sansPiece;
    return nombre > 0 ? alerte(total, nombre) : ok();
  },
};

export interface ObjetPaiementsSeuil {
  debits: readonly DebitBancaire[];
  /** Seuil réglable, en centimes, strictement positif ; absent = exception codée. */
  seuil?: Centimes;
}

export const regleCCK13S: RegleControle<ObjetPaiementsSeuil> = {
  id: 'CC-K13S',
  version: 1,
  gravite: 'B',
  bloque: ['validation'],
  declencheurs: DECLENCHEURS,
  actif: true,
  evaluer: ({ debits, seuil }) => {
    if (seuil === undefined) throw new ErreurControle('parametre_absent');
    if (!Number.isSafeInteger(seuil) || seuil <= 0) throw new ErreurControle('entree_invalide');
    const { nombre, total } = compterPaiementsSansPiece(debits).sansPiece;
    return total >= seuil ? alerte(total, nombre) : ok();
  },
};
