// Récapitulatif d'un dépôt de pièces dans le chat : une carte par pièce jusqu'à 3, au-delà un récapitulatif,
// une question simple par pièce douteuse, message final « bien_recu ». Aucune validation automatique (V3-IMP-041).
import { type Confiance, ErreurChat } from './types.js';

/** Au plus ce nombre de pièces : une carte chacune ; au-delà : un récapitulatif. */
export const MAX_CARTES = 3;

export interface PieceDepot {
  id: string;
  libelle: string;
  lue: boolean;
  /** Dossier de rangement, absent tant que la pièce n'est pas rangée. */
  rangeeDans?: string | undefined;
  /** Écriture proposée, absente tant qu'aucune n'est prête. */
  proposition?: string | undefined;
  confiance: Confiance;
}

export interface CarteDepot {
  pieceId: string;
  libelle: string;
  lue: boolean;
  rangee: boolean;
  proposee: boolean;
}

export interface QuestionDepot {
  pieceId: string;
  code: 'piece_douteuse';
  libelle: string;
}

export interface RecapitulatifDepot {
  total: number;
  lues: number;
  rangees: number;
  proposees: number;
}

export interface ResultatDepot {
  cartes: CarteDepot[];
  recapitulatif?: RecapitulatifDepot;
  questions: QuestionDepot[];
  /** `aValider` : pièces lues, que la personne doit encore valider elle-même. */
  message: { code: 'bien_recu'; aValider: number };
}

const rangee = (p: PieceDepot): boolean => p.rangeeDans !== undefined && p.rangeeDans !== '';
const proposee = (p: PieceDepot): boolean => p.proposition !== undefined && p.proposition !== '';
const douteuse = (p: PieceDepot): boolean => !p.lue || p.confiance === 'douteux';

export function recapDepot(pieces: readonly PieceDepot[]): ResultatDepot {
  if (pieces.length === 0) throw new ErreurChat('depot_vide');
  if (new Set(pieces.map((p) => p.id)).size !== pieces.length) throw new ErreurChat('piece_en_double');
  const questions: QuestionDepot[] = pieces
    .filter(douteuse)
    .map((p) => ({ pieceId: p.id, code: 'piece_douteuse', libelle: p.libelle }));
  const message = { code: 'bien_recu' as const, aValider: pieces.filter((p) => p.lue).length };
  if (pieces.length <= MAX_CARTES) {
    const cartes = pieces.map((p) => ({
      pieceId: p.id,
      libelle: p.libelle,
      lue: p.lue,
      rangee: rangee(p),
      proposee: proposee(p),
    }));
    return { cartes, questions, message };
  }
  const recapitulatif = {
    total: pieces.length,
    lues: pieces.filter((p) => p.lue).length,
    rangees: pieces.filter(rangee).length,
    proposees: pieces.filter(proposee).length,
  };
  return { cartes: [], recapitulatif, questions, message };
}
