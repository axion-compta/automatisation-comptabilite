// Groupes de rapprochement : un débit pour plusieurs pièces (combinaison exacte bornée), plusieurs paiements pour une pièce.
import type { Centimes } from '../../argent/index.js';
import { ajouterJours, comparerDates } from '../../dates/civiles.js';
import type { Lien, LigneBancaire, PieceCandidate } from '../types.js';
import { verifierNouveauLien } from './sommes.js';

export type CodeGroupe = 'bornes_invalides' | 'montant_nul' | 'lien_invalide';
export class ErreurGroupe extends Error {
  override name = 'ErreurGroupe';
  constructor(readonly code: CodeGroupe) {
    super(code);
  }
}

/** Limite technique contre l'explosion combinatoire ; la borne métier est passée en argument. */
export const LIMITE_TECHNIQUE_PIECES = 12;
/** Rang de passe attribué aux liens de groupe. */
export const PASSE_GROUPE = 4;
const NB_COMBINAISONS_MAX = 3;

export type PieceAvecReste = PieceCandidate & { reste: Centimes };
export type Bornes = { maxPieces: number; fenetreJours: number };
export type ResultatUnPourN =
  | { type: 'proposee'; pieces: string[] }
  | { type: 'douteuse'; combinaisons: [string[], string[]] }
  | { type: 'aucun' };

const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
const parDateId = (a: { date: string; id: string }, b: { date: string; id: string }): number => comparerDates(a.date, b.date) || cmp(a.id, b.id);
const valeur = (p: PieceAvecReste): number => (p.avoir === true ? -p.reste : p.reste);

export function groupeUnPourN(ligne: LigneBancaire, pieces: readonly PieceAvecReste[], bornes: Bornes): ResultatUnPourN {
  const { maxPieces, fenetreJours } = bornes;
  if (!Number.isInteger(maxPieces) || maxPieces < 1 || maxPieces > LIMITE_TECHNIQUE_PIECES) throw new ErreurGroupe('bornes_invalides');
  if (!Number.isInteger(fenetreJours) || fenetreJours < 0) throw new ErreurGroupe('bornes_invalides');
  if (ligne.montant === 0) throw new ErreurGroupe('montant_nul');
  if (ligne.contrepartieId === undefined || ligne.contrepartieId === '') return { type: 'aucun' };
  const debut = ajouterJours(ligne.dateOperation, -fenetreJours);
  const fin = ajouterJours(ligne.dateOperation, fenetreJours);
  const cibles = pieces
    .filter((p) => p.contrepartieId === ligne.contrepartieId && p.reste !== 0 && comparerDates(p.date, debut) >= 0 && comparerDates(p.date, fin) <= 0)
    .sort(parDateId);
  const cible = Math.abs(ligne.montant);
  const trouvees: string[][] = [];
  const explorer = (taille: number, depart: number, choisies: PieceAvecReste[], somme: number): void => {
    if (trouvees.length >= NB_COMBINAISONS_MAX) return;
    if (choisies.length === taille) {
      if (somme === cible) trouvees.push(choisies.map((p) => p.id));
      return;
    }
    for (let i = depart; i < cibles.length; i++) {
      const p = cibles[i] as PieceAvecReste;
      explorer(taille, i + 1, [...choisies, p], somme + valeur(p));
    }
  };
  for (let t = 1; t <= maxPieces && trouvees.length < NB_COMBINAISONS_MAX; t++) explorer(t, 0, [], 0);
  const [a, b] = trouvees;
  if (a === undefined) return { type: 'aucun' };
  return b === undefined ? { type: 'proposee', pieces: a } : { type: 'douteuse', combinaisons: [a, b] };
}

export function groupeNPourUn(piece: PieceAvecReste, lignes: readonly LigneBancaire[]): { lignes: LigneBancaire[]; resteApres: Centimes } {
  const prises: LigneBancaire[] = [];
  let reste = piece.reste as number;
  const candidates = lignes
    .filter((l) => l.montant !== 0 && l.contrepartieId === piece.contrepartieId && piece.contrepartieId !== undefined)
    .sort((a, b) => comparerDates(a.dateOperation, b.dateOperation) || a.rang - b.rang || cmp(a.id, b.id));
  for (const l of candidates) {
    if (reste <= 0 || Math.abs(l.montant) > reste) break;
    prises.push(l);
    reste -= Math.abs(l.montant);
  }
  return { lignes: prises, resteApres: reste as Centimes };
}

type Existants = readonly Pick<Lien, 'ligneId' | 'pieceId' | 'montantAffecte' | 'etat'>[];
const lienPropose = (groupeId: string, ligneId: string, pieceId: string, m: number, code: string): Lien => ({
  id: `${groupeId}:${ligneId}:${pieceId}`, groupeId, ligneId, pieceId, montantAffecte: m as Centimes, score: 0, facteurs: [],
  passe: PASSE_GROUPE, codeRaison: code, proposePar: 'regle', etat: 'propose', version: 1,
});

/** Liens d'un débit pour plusieurs pièces : écart total nul exigé (net des avoirs égal au montant de la ligne). */
export function liensUnPourN(groupeId: string, ligne: LigneBancaire, pieces: readonly PieceAvecReste[], existants: Existants): Lien[] {
  const total = pieces.reduce((s, p) => s + p.reste, 0);
  const net = pieces.reduce((s, p) => s + valeur(p), 0);
  if (net !== Math.abs(ligne.montant) || ligne.montant === 0) throw new ErreurGroupe('lien_invalide');
  const etendue = { id: ligne.id, montant: total };
  const liens: Lien[] = [];
  for (const p of pieces) {
    const v = verifierNouveauLien({ ligneId: ligne.id, pieceId: p.id, montantAffecte: p.reste }, etendue, p, [...existants, ...liens]);
    if (!v.ok) throw new ErreurGroupe('lien_invalide');
    liens.push(lienPropose(groupeId, ligne.id, p.id, p.reste, 'groupe_1_n'));
  }
  return liens;
}

/** Liens de plusieurs paiements pour une pièce, chacun vérifié contre le reste de la pièce. */
export function liensNPourUn(groupeId: string, piece: PieceAvecReste, lignes: readonly LigneBancaire[], existants: Existants): Lien[] {
  const liens: Lien[] = [];
  for (const l of lignes) {
    const m = Math.abs(l.montant);
    const v = verifierNouveauLien({ ligneId: l.id, pieceId: piece.id, montantAffecte: m }, l, piece, [...existants, ...liens]);
    if (!v.ok) throw new ErreurGroupe('lien_invalide');
    liens.push(lienPropose(groupeId, l.id, piece.id, m, 'groupe_n_1'));
  }
  return liens;
}
