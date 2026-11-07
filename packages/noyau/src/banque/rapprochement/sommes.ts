import { centimes, type Centimes } from '../../argent/index.js';
import type { Lien } from '../types.js';

export type Verdict =
  | { ok: true }
  | { ok: false; code: 'depasse_piece' | 'depasse_ligne'; maximum: Centimes }
  | { ok: false; code: 'montant_invalide' | 'piece_invalide' };

type LienCompte = Pick<Lien, 'ligneId' | 'pieceId' | 'montantAffecte' | 'etat'>;
const compte = (l: LienCompte): boolean => l.etat === 'propose' || l.etat === 'valide';
const somme = (liens: readonly LienCompte[], garde: (l: LienCompte) => boolean): number =>
  liens.filter((l) => compte(l) && garde(l)).reduce((s, l) => s + l.montantAffecte, 0);

export function restePiece(piece: { id: string; montant: number }, liens: readonly LienCompte[]): Centimes {
  return centimes(piece.montant - somme(liens, (l) => l.pieceId === piece.id));
}

export function resteLigne(ligne: { id: string; montant: number }, liens: readonly LienCompte[]): Centimes {
  return centimes(Math.abs(ligne.montant) - somme(liens, (l) => l.ligneId === ligne.id));
}

export function verifierNouveauLien(
  nouveau: { ligneId: string; pieceId?: string | undefined; montantAffecte: number },
  ligne: { id: string; montant: number },
  piece: { id: string; montant: number } | undefined,
  liens: readonly LienCompte[],
): Verdict {
  const m = nouveau.montantAffecte;
  if (!Number.isSafeInteger(m) || m <= 0) return { ok: false, code: 'montant_invalide' };
  if (piece && !(Number.isSafeInteger(piece.montant) && piece.montant >= 0)) return { ok: false, code: 'piece_invalide' };
  if (piece) {
    const reste = restePiece(piece, liens);
    if (m > reste) return { ok: false, code: 'depasse_piece', maximum: centimes(Math.max(0, reste)) };
  }
  const resteL = resteLigne(ligne, liens);
  if (m > resteL) return { ok: false, code: 'depasse_ligne', maximum: centimes(Math.max(0, resteL)) };
  return { ok: true };
}
