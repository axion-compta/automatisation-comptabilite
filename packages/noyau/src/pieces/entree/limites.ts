import { ErreurPiece } from '../types.js';

export interface ReglageLimites { tailleMaxOctets: number; pagesMaxFileNormale: number; pagesMaxModele: number }
export type ResultatLimites = { refus: 'trop_grand' } | { file: 'normale' | 'gros_documents'; pagesAuModele: number };

const entier = (v: number, code: 'entree_invalide' | 'reglage_invalide', minimum: bigint): bigint => {
  if (!Number.isInteger(v) || BigInt(v) < minimum) throw new ErreurPiece(code, code);
  return BigInt(v);
};

export function evaluerLimites(entree: { tailleOctets: number; nbPages: number }, reglage: ReglageLimites): ResultatLimites {
  const tailleMax = entier(reglage.tailleMaxOctets, 'reglage_invalide', 1n);
  const pagesNormale = entier(reglage.pagesMaxFileNormale, 'reglage_invalide', 1n);
  const pagesModele = entier(reglage.pagesMaxModele, 'reglage_invalide', 1n);
  const taille = entier(entree.tailleOctets, 'entree_invalide', 0n);
  const pages = entier(entree.nbPages, 'entree_invalide', 0n);
  if (taille > tailleMax) return { refus: 'trop_grand' };
  return { file: pages > pagesNormale ? 'gros_documents' : 'normale', pagesAuModele: Number(pages < pagesModele ? pages : pagesModele) };
}

export function autoriserAppel(e: { depenseMicroCentimes: number; estimationMicroCentimes: number; plafondMicroCentimes: number }): 'autorise' | 'plafond_cout' {
  const depense = entier(e.depenseMicroCentimes, 'entree_invalide', 0n);
  const estimation = entier(e.estimationMicroCentimes, 'entree_invalide', 0n);
  const limite = entier(e.plafondMicroCentimes, 'entree_invalide', 0n);
  return depense + estimation > limite ? 'plafond_cout' : 'autorise';
}

export function constaterApresAppel(e: { depenseMicroCentimes: number; coutReelMicroCentimes: number; plafondMicroCentimes: number }): { depense: number; arret: boolean } {
  const depense = entier(e.depenseMicroCentimes, 'entree_invalide', 0n);
  const reel = entier(e.coutReelMicroCentimes, 'entree_invalide', 0n);
  const limite = entier(e.plafondMicroCentimes, 'entree_invalide', 0n);
  const total = depense + reel;
  return { depense: Number(total), arret: total >= limite };
}
