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

const comparer = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

// Un seul chemin par empreinte : celui de la première pièce (date, puis id).
function cheminsParPiece(pieces: PieceArchive[]): Map<string, string> {
  for (const p of pieces) cheminPiece(p);
  const ordre = [...pieces].sort((x, y) => comparer(x.recueLe, y.recueLe) || comparer(x.id, y.id));
  const parEmpreinte = new Map<string, string>();
  const resultat = new Map<string, string>();
  for (const p of ordre) {
    if (!parEmpreinte.has(p.empreinte)) parEmpreinte.set(p.empreinte, cheminPiece(p));
    resultat.set(p.id, parEmpreinte.get(p.empreinte) as string);
  }
  return resultat;
}

export function indexPieces(pieces: PieceArchive[]): LigneIndex[] {
  const chemins = cheminsParPiece(pieces);
  return pieces
    .map((p) => {
      if (p.ecritures.some((e) => e.includes(SEPARATEUR))) throw new ErreurExploitation('chemin_invalide');
      return { chemin: chemins.get(p.id) as string, pieceId: p.id, ecritures: trier(p.ecritures).join(SEPARATEUR) };
    })
    .sort((a, b) => comparer(a.chemin, b.chemin) || comparer(a.pieceId, b.pieceId));
}

function verifierNomFec(nom: string): void {
  const interdit =
    typeof nom !== 'string' ||
    nom.replace(/[ .]/g, '') === '' ||
    nom.includes('/') ||
    nom.includes('\\') ||
    nom.includes('..') ||
    [...nom].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127 || (c.charCodeAt(0) >= 128 && c.charCodeAt(0) < 160));
  if (interdit) throw new ErreurExploitation('chemin_invalide');
}

export function arborescence(o: {
  exercices: { code: string; fecNom: string }[];
  pieces: PieceArchive[];
  avecConversations: boolean;
  avecParametrages: boolean;
}): string[] {
  for (const e of o.exercices) verifierNomFec(e.fecNom);
  const cheminsPieces = new Set(cheminsParPiece(o.pieces).values());
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
