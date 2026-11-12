// Lien pièce-écriture : règle pure, en ajout seul. Aucune horloge : `cree_le` vient de l'appelant.

export type CodeErreurLienPiece =
  | 'lien_en_double'
  | 'empreinte_invalide'
  | 'lien_ajout_seul'
  | 'piece_ou_motif_requis';

export class ErreurLienPiece extends Error {
  override name = 'ErreurLienPiece';
  readonly code: CodeErreurLienPiece;
  constructor(code: CodeErreurLienPiece, message: string) {
    super(message);
    this.code = code;
  }
}

export interface LienPieceEcriture {
  pieceId: string;
  ecritureId: string;
  /** Empreinte sha256 de la pièce : 64 caractères hexadécimaux minuscules. */
  empreintePiece: string;
  auteur: { type: 'ia' | 'personne'; id: string };
  cree_le: string;
}

const SHA256 = /^[0-9a-f]{64}$/;

/** Ajoute un lien et retourne une nouvelle liste ; l'entrée n'est jamais modifiée. */
export function ajouterLien(
  liens: readonly LienPieceEcriture[],
  nouveau: LienPieceEcriture,
): LienPieceEcriture[] {
  if (!SHA256.test(nouveau.empreintePiece)) {
    throw new ErreurLienPiece('empreinte_invalide', "L'empreinte de la pièce est mal formée.");
  }
  const doublon = liens.some(
    (l) =>
      l.pieceId === nouveau.pieceId &&
      l.ecritureId === nouveau.ecritureId &&
      l.empreintePiece === nouveau.empreintePiece,
  );
  if (doublon) {
    throw new ErreurLienPiece('lien_en_double', 'Ce lien existe déjà.');
  }
  return [...liens, nouveau];
}

/** Un lien n'est jamais modifié ni supprimé : la persistance appelle cette fonction. */
export function refuserModification(): never {
  throw new ErreurLienPiece('lien_ajout_seul', 'Un lien pièce-écriture se crée, il ne se modifie pas.');
}

/** Refuse si l'écriture n'a ni pièce liée ni motif non vide. */
export function exigerJustification(
  ecritureId: string,
  liens: readonly LienPieceEcriture[],
  motif: string,
): void {
  if (liens.some((l) => l.ecritureId === ecritureId)) return;
  if (motif.trim() !== '') return;
  throw new ErreurLienPiece('piece_ou_motif_requis', 'Une pièce liée ou un motif est requis.');
}
