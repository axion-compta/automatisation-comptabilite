// Clé de dédoublonnage des ventes : une même facture reçue par deux canaux = une seule pièce.
import type { Centimes } from '../argent/index.js';
import { estDateValide } from '../dates/civiles.js';

export interface EntreeCle {
  readonly sirenVendeur: string;
  readonly numero: string;
  readonly dateFacture: string;
  readonly ttc: Centimes;
}

export interface PieceRecue {
  readonly id: string;
  readonly recuLe: string;
  readonly cle: string | null;
}

export interface ResultatDedoublonnage {
  readonly gardees: string[];
  readonly doublons: { id: string; doublonDe: string }[];
}

function compact(valeur: unknown): string {
  return typeof valeur === 'string' ? valeur.replace(/\s+/gu, '') : '';
}

/** Clé stable, ou `null` si un champ manque ou est invalide (jamais un doublon). */
export function cleDedoublonnage(entree: EntreeCle): string | null {
  const siren = compact(entree.sirenVendeur);
  const numero = compact(entree.numero).toUpperCase();
  if (siren === '' || numero === '') return null;
  if (typeof entree.dateFacture !== 'string' || !estDateValide(entree.dateFacture)) return null;
  if (typeof entree.ttc !== 'number' || !Number.isSafeInteger(entree.ttc)) return null;
  return [siren, numero, entree.dateFacture, String(entree.ttc)].join('|');
}

function avant(a: PieceRecue, b: PieceRecue): boolean {
  if (a.recuLe !== b.recuLe) return a.recuLe < b.recuLe;
  return a.id < b.id;
}

/** La première reçue (`recuLe`, puis `id`) est gardée ; les autres lui sont rattachées. */
export function dedoublonner(pieces: readonly PieceRecue[]): ResultatDedoublonnage {
  const gardees: string[] = [];
  const doublons: { id: string; doublonDe: string }[] = [];
  const premieres = new Map<string, PieceRecue>();
  for (const p of pieces) {
    if (p.cle === null) continue;
    const actuelle = premieres.get(p.cle);
    if (actuelle === undefined || avant(p, actuelle)) premieres.set(p.cle, p);
  }
  const ordre = [...pieces].sort((a, b) => (avant(a, b) ? -1 : avant(b, a) ? 1 : 0));
  for (const p of ordre) {
    const premiere = p.cle === null ? undefined : premieres.get(p.cle);
    if (premiere === undefined || premiere.id === p.id) gardees.push(p.id);
    else doublons.push({ id: p.id, doublonDe: premiere.id });
  }
  return { gardees, doublons };
}

/** Entrantes à créer : clé nulle ou inconnue, sans doublon interne. */
export function aCreer<T extends { cle: string | null }>(
  clesExistantes: ReadonlySet<string>,
  entrantes: readonly T[],
): T[] {
  const vues = new Set<string>();
  const res: T[] = [];
  for (const e of entrantes) {
    if (e.cle !== null) {
      if (clesExistantes.has(e.cle) || vues.has(e.cle)) continue;
      vues.add(e.cle);
    }
    res.push(e);
  }
  return res;
}
