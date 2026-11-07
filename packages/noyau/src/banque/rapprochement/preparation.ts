// Préparation du rapprochement : tri des lignes et pièces utilisables, puis neutralisation des allers-retours.
import type { Centimes } from '../../argent/index.js';
import { estComptable, type Lien, type LigneBancaire, type PieceCandidate } from '../types.js';
import { resteLigne, restePiece } from './sommes.js';

export class ErreurPreparation extends Error {
  override name = 'ErreurPreparation';
  constructor(readonly code: 'societe_absente') {
    super(code);
  }
}

export type MotifEcart = 'autre_societe' | 'non_comptable' | 'deja_validee' | 'piece_soldee';
export type PieceAvecReste = PieceCandidate & { reste: Centimes };
export type Preparation = { lignes: LigneBancaire[]; pieces: PieceAvecReste[]; ecartees: { id: string; motif: MotifEcart }[] };

export function preparer(
  societeId: string, lignes: readonly LigneBancaire[], pieces: readonly PieceCandidate[], liens: readonly Lien[],
): Preparation {
  if (societeId === '') throw new ErreurPreparation('societe_absente');
  const valides = liens.filter((l) => l.etat === 'valide');
  const sortie: Preparation = { lignes: [], pieces: [], ecartees: [] };
  for (const l of lignes) {
    if (l.societeId !== societeId) sortie.ecartees.push({ id: l.id, motif: 'autre_societe' });
    else if (!estComptable(l)) sortie.ecartees.push({ id: l.id, motif: 'non_comptable' });
    else if (resteLigne(l, valides) <= 0) sortie.ecartees.push({ id: l.id, motif: 'deja_validee' });
    else sortie.lignes.push(l);
  }
  for (const p of pieces) {
    if (p.societeId !== societeId) {
      sortie.ecartees.push({ id: p.id, motif: 'autre_societe' });
      continue;
    }
    const reste = restePiece(p, liens);
    if (reste <= 0) sortie.ecartees.push({ id: p.id, motif: 'piece_soldee' });
    else sortie.pieces.push({ ...p, reste });
  }
  return sortie;
}

const parRang = (a: LigneBancaire, b: LigneBancaire): number => a.rang - b.rang || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Débit puis crédit identiques le même jour, même compte, même contrepartie renseignée : appariés par rang croissant. */
export function neutraliser(lignes: readonly LigneBancaire[]): { debitId: string; creditId: string }[] {
  const groupes = new Map<string, { debits: LigneBancaire[]; credits: LigneBancaire[] }>();
  for (const l of [...lignes].sort(parRang)) {
    if (!Number.isSafeInteger(l.montant) || l.montant === 0 || l.contrepartieId === undefined || l.contrepartieId === '') continue;
    const cle = JSON.stringify([l.compteId, l.dateOperation, l.contrepartieId, Math.abs(l.montant)]);
    const g = groupes.get(cle) ?? { debits: [], credits: [] };
    (l.montant < 0 ? g.debits : g.credits).push(l);
    groupes.set(cle, g);
  }
  const paires: { debitId: string; creditId: string; rang: number }[] = [];
  for (const g of groupes.values()) {
    const n = Math.min(g.debits.length, g.credits.length);
    for (let i = 0; i < n; i++) paires.push({ debitId: (g.debits[i] as LigneBancaire).id, creditId: (g.credits[i] as LigneBancaire).id, rang: (g.debits[i] as LigneBancaire).rang });
  }
  return paires.sort((a, b) => a.rang - b.rang || (a.debitId < b.debitId ? -1 : 1)).map(({ debitId, creditId }) => ({ debitId, creditId }));
}
