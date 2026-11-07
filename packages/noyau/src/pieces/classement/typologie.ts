// Typologie des pièces : le type proposé par le lecteur est confirmé par des règles en code.
import type { Centimes } from '../../argent/index.js';
import { ErreurPiece, type MotifAVerifier, type MotifNonComptee, type TypePiece } from '../types.js';
import { MOTS_CLES_TYPES } from './mots-cles-types.js';

export type MotifNonPiece = 'commande' | 'contrat' | 'reservation' | 'rappel' | 'devis' | 'autre';
export type CompteeParDefaut = { comptee: true } | { comptee: false; motif: MotifNonComptee };
export interface IndicesType { texte: string; ttc?: Centimes; ht?: Centimes; nombreDeNumerosDeFacture: number; }
export interface TypeConfirme { type: TypePiece; aVerifier?: Extract<MotifAVerifier, 'desaccord_type' | 'ttc_nul_ht_non_nul' | 'plusieurs_factures'>; motifNonPiece?: MotifNonPiece; }

const MOTIFS_FIXES: Partial<Record<TypePiece, MotifNonComptee>> = { annulee: 'annulee', montant_zero: 'montant_zero', releve_fournisseur: 'releve', plusieurs_factures: 'plusieurs_factures', inconnu: 'inconnu', facture_dans_corps: 'a_verifier' };

/** Une pièce non comptée n'entre dans aucune somme, ni dans la TVA. */
export function compteeParDefaut(type: TypePiece, motifNonPiece: MotifNonPiece = 'autre'): CompteeParDefaut {
  if (type === 'non_piece') return { comptee: false, motif: motifNonPiece };
  const motif = MOTIFS_FIXES[type];
  return motif === undefined ? { comptee: true } : { comptee: false, motif };
}

const normaliser = (texte: unknown): string =>
  typeof texte === 'string' ? ' ' + texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() + ' ' : '  ';
const contient = (t: string, mots: readonly string[]): boolean => mots.some((m) => t.includes(' ' + m + ' '));
const estEntier = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v);

function verifier(i: IndicesType): void {
  if ((i.ttc !== undefined && !estEntier(i.ttc)) || (i.ht !== undefined && !estEntier(i.ht))) throw new ErreurPiece('montant_invalide', 'Les montants doivent être des entiers de centimes.');
  if (!estEntier(i.nombreDeNumerosDeFacture) || i.nombreDeNumerosDeFacture < 0) throw new ErreurPiece('nombre_invalide', 'Le nombre de numéros doit être un entier positif ou nul.');
}

const SORTES_NON_PIECE = ['commande', 'devis', 'contrat', 'reservation', 'rappel'] as const;
function motifNonPiece(t: string): MotifNonPiece | undefined {
  return SORTES_NON_PIECE.find((s) => contient(t, MOTS_CLES_TYPES[s]));
}

/** Avis des règles en code : `null` = pas d'avis. */
export function typeParRegles(indices: IndicesType): TypePiece | null {
  verifier(indices);
  const t = normaliser(indices.texte);
  if (indices.nombreDeNumerosDeFacture > 1) return 'plusieurs_factures';
  if (contient(t, MOTS_CLES_TYPES.avoir) || (indices.ttc !== undefined && indices.ttc < 0)) return 'avoir';
  if (contient(t, MOTS_CLES_TYPES.acompte)) return 'facture_acompte';
  if (contient(t, MOTS_CLES_TYPES.releve)) return 'releve_fournisseur';
  if (motifNonPiece(t) !== undefined) return 'non_piece';
  if (indices.ttc === 0 && indices.ht === 0) return 'montant_zero';
  return null;
}

export function confirmerType(propose: TypePiece, indices: IndicesType): TypeConfirme {
  const regle = typeParRegles(indices);
  const nonPiece = motifNonPiece(normaliser(indices.texte));
  const motif = (regle === 'non_piece' || propose === 'non_piece') && nonPiece !== undefined ? { motifNonPiece: nonPiece } : {};
  if (regle === 'plusieurs_factures') return { type: 'plusieurs_factures', aVerifier: 'plusieurs_factures' };
  if (indices.ttc === 0 && indices.ht !== undefined && indices.ht !== 0) return { type: propose, aVerifier: 'ttc_nul_ht_non_nul', ...motif };
  if (regle !== null && regle !== propose) return { type: propose, aVerifier: 'desaccord_type', ...motif };
  return { type: propose, ...motif };
}
