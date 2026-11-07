// Règles C2 et C3 : un lot VERT se valide par un geste humain unique ; regroupement des cas semblables.
// Aucun texte affiché ici : seulement des codes. Aucune validation sans personne en A0.
import { ajouter, centimes, type Centimes } from '../../argent/index.js';
import type { Couleur } from './couleur.js';

export type Acteur = { type: 'personne'; id: string } | { type: 'agent'; id: string };

export type CodeErreurLot = 'piece_non_verte' | 'lot_vide' | 'niveau_v1' | 'entree_invalide' | 'cas_en_double';

export class ErreurLot extends Error {
  override name = 'ErreurLot';
  readonly code: CodeErreurLot;
  constructor(code: CodeErreurLot) {
    super(code);
    this.code = code;
  }
}

export interface PieceLot {
  id: string;
  couleur: Couleur;
  ttc: Centimes;
}

export interface Recapitulatif {
  nombre: number;
  total: Centimes;
}

/** Nombre et total des pièces VERTES ; lot vide, pièce non VERTE ou montant invalide = exception codée. */
export function recapitulatifLot(pieces: readonly PieceLot[]): Recapitulatif {
  if (pieces.length === 0) throw new ErreurLot('lot_vide');
  let total = centimes(0);
  for (const p of pieces) {
    if (p.couleur !== 'VERT') throw new ErreurLot('piece_non_verte');
    if (!Number.isSafeInteger(p.ttc)) throw new ErreurLot('entree_invalide');
    total = ajouter(total, p.ttc);
  }
  return { nombre: pieces.length, total };
}

export interface DemandeValidation {
  pieces: readonly PieceLot[];
  acteur: Acteur;
  niveau: 'A0';
  recapitulatifVu: Recapitulatif;
}

export type ResultatValidation =
  | { ok: true; ecritures: { id: string; valide_par: string }[] }
  | { ok: false; code: 'geste_humain_requis' | 'recapitulatif_perime' };

export function validerLot(d: DemandeValidation): ResultatValidation {
  if (d.niveau !== 'A0') throw new ErreurLot('niveau_v1');
  if (d.acteur.type !== 'personne') return { ok: false, code: 'geste_humain_requis' };
  const recap = recapitulatifLot(d.pieces);
  if (d.recapitulatifVu.nombre !== recap.nombre || d.recapitulatifVu.total !== recap.total) {
    return { ok: false, code: 'recapitulatif_perime' };
  }
  return { ok: true, ecritures: d.pieces.map((p) => ({ id: p.id, valide_par: (d.acteur as { id: string }).id })) };
}

export interface CasSemblable {
  id: string;
  motif: string;
  fournisseurId: string;
}

export interface GroupeCas {
  motif: string;
  fournisseurId: string;
  ids: string[];
}

const comparer = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Groupes par (motif, fournisseur), triés, sans perte ; un identifiant en double = exception codée. */
export function regrouper(cas: readonly CasSemblable[]): GroupeCas[] {
  const vus = new Set<string>();
  const groupes = new Map<string, GroupeCas>();
  for (const x of cas) {
    if (vus.has(x.id)) throw new ErreurLot('cas_en_double');
    vus.add(x.id);
    const cle = JSON.stringify([x.motif, x.fournisseurId]);
    const g = groupes.get(cle) ?? { motif: x.motif, fournisseurId: x.fournisseurId, ids: [] };
    g.ids.push(x.id);
    groupes.set(cle, g);
  }
  const liste = [...groupes.values()];
  for (const g of liste) g.ids.sort(comparer);
  return liste.sort((a, b) => comparer(a.motif, b.motif) || comparer(a.fournisseurId, b.fournisseurId));
}
