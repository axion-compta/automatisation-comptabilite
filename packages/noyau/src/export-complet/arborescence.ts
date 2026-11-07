import { ErreurExploitation, verifierDate, verifierEmpreinte } from '../exploitation/types.js';

export type PieceArchive = { id: string; empreinte: string; recueLe: string; extension: string; ecritures: string[] };
export type LigneIndex = { chemin: string; pieceId: string; ecritures: string };

const FORME_EXTENSION = /^[a-z0-9]{1,8}$/;
const SEPARATEUR = '|';
const FIXES = ['LISEZMOI.txt', 'comptable/balance.csv', 'comptable/grand-livre.csv', 'comptable/journaux.csv', 'pieces/index.csv'];
const CONVERSATIONS = ['conversations/conversations.txt'];
const PARAMETRAGES = ['regles', 'modeles', 'fournisseurs', 'memoire'].map((n) => `parametrages/${n}.jsonl`);

const trier = (l: string[]): string[] => [...l].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

export function cheminPiece(p: { empreinte: string; recueLe: string; extension: string }): string {
  verifierEmpreinte(p.empreinte);
  verifierDate(p.recueLe);
  const extension = typeof p.extension === 'string' ? p.extension.toLowerCase() : '';
  if (!FORME_EXTENSION.test(extension)) throw new ErreurExploitation('chemin_invalide');
  return `pieces/${p.recueLe.slice(0, 4)}/${p.recueLe.slice(5, 7)}/${p.empreinte}.${extension}`;
}

export function indexPieces(pieces: PieceArchive[]): LigneIndex[] {
  return pieces
    .map((p) => ({ chemin: cheminPiece(p), pieceId: p.id, ecritures: trier(p.ecritures).join(SEPARATEUR) }))
    .sort((a, b) => (a.chemin < b.chemin ? -1 : a.chemin > b.chemin ? 1 : a.pieceId < b.pieceId ? -1 : a.pieceId > b.pieceId ? 1 : 0));
}

function verifierNomFec(nom: string): void {
  const interdit =
    typeof nom !== 'string' ||
    nom === '' ||
    nom.includes('/') ||
    nom.includes('\\') ||
    nom.includes('..') ||
    [...nom].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127);
  if (interdit) throw new ErreurExploitation('chemin_invalide');
}

export function arborescence(o: {
  exercices: { code: string; fecNom: string }[];
  pieces: PieceArchive[];
  avecConversations: boolean;
  avecParametrages: boolean;
}): string[] {
  for (const e of o.exercices) verifierNomFec(e.fecNom);
  const cheminsPieces = new Set(o.pieces.map(cheminPiece));
  const chemins = [
    ...FIXES,
    ...o.exercices.map((e) => `fec/${e.fecNom}`),
    ...cheminsPieces,
    ...(o.avecConversations ? CONVERSATIONS : []),
    ...(o.avecParametrages ? PARAMETRAGES : []),
  ];
  if (new Set(chemins).size !== chemins.length) throw new ErreurExploitation('chemin_en_double');
  return trier(chemins);
}
