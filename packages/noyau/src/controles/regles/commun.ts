// Types et outils communs aux contrôles CC-K et CC-T du lot 12.
// Aucun texte affiché ici : seulement des codes.
import type { Centimes } from '../../argent/index.js';
import type { SortieRegle } from '../moteur.js';

export interface LignePiece {
  /** Taux en points de base. */
  taux: number;
  nature: string;
  ht: Centimes;
  tva: Centimes;
  ttc: Centimes;
  compte?: string;
}

export interface PieceControlee {
  id: string;
  sens: 'achat' | 'vente';
  /** AAAA-MM-JJ */
  date: string;
  lignes: readonly LignePiece[];
  totaux: { ht: Centimes; tva: Centimes; ttc: Centimes };
  montantDu?: Centimes;
  destinataire?: { nom: string; siren?: string };
  emetteur?: { nom: string; siren?: string; pays?: string };
  fournisseurId?: string;
  mentions: readonly string[];
}

/** Copie simple de ce que rend le paquet des paramètres (non importé). */
export interface ParametreLu {
  cle: string;
  valeur: string | null;
  statut: 'valide' | 'a_verifier' | 'non_verifie' | 'absent';
}

export type CodeErreurControle = 'entree_invalide' | 'parametre_invalide' | 'parametre_absent';

export class ErreurControle extends Error {
  override name = 'ErreurControle';
  readonly code: CodeErreurControle;
  constructor(code: CodeErreurControle) {
    super(code);
    this.code = code;
  }
}

export function parametreUtilisable(p: ParametreLu): boolean {
  return p.statut === 'valide' && p.valeur !== null;
}

const ENTIER = /^-?[0-9]+$/;

/** Lit la valeur comme entier sûr ; paramètre inutilisable ou mal formé = exception codée. */
export function entierParametre(p: ParametreLu): number {
  if (!parametreUtilisable(p) || p.valeur === null) throw new ErreurControle('parametre_absent');
  if (!ENTIER.test(p.valeur)) throw new ErreurControle('parametre_invalide');
  const n = Number(p.valeur);
  if (!Number.isSafeInteger(n)) throw new ErreurControle('parametre_invalide');
  return n;
}

export function exigerCentimes(n: number): Centimes {
  if (!Number.isSafeInteger(n)) throw new ErreurControle('entree_invalide');
  return n as Centimes;
}

export function ok(): SortieRegle {
  return { resultat: 'OK' };
}

export function alerte(ecart?: Centimes, valeur?: string | number): SortieRegle {
  const sortie: SortieRegle = { resultat: 'ALERTE' };
  if (ecart !== undefined) sortie.ecartCentimes = ecart;
  if (valeur !== undefined) sortie.valeur = valeur;
  return sortie;
}
