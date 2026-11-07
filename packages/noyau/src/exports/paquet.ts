import { empreinteSha256, ErreurDocument, manifeste } from '../documents/empreinte.js';
import type { FichierDocument } from '../documents/empreinte.js';
import { natureAutorisee } from '../documents/mention.js';
import type { ModeTravail, NatureDocument, StatutExercice, TypeEtat } from '../documents/mention.js';

export class ErreurPaquet extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'ErreurPaquet';
    this.code = code;
  }
}

export interface PiecePaquet {
  pieceRef: string;
  ecritureIds: string[];
  nom: string;
  octets: Uint8Array;
  empreinteOriginale: string;
}

export const NOM_INDEX = 'index_pieces.csv';
export const NOM_MANIFESTE = 'MANIFESTE.sha256';

const comparer = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export function composerPaquet(
  entree: {
    mode: ModeTravail;
    exerciceStatut: StatutExercice;
    travail: boolean;
    documents: { nom: string; nature: NatureDocument; type: TypeEtat; octets: Uint8Array }[];
    pieces: PiecePaquet[];
  },
  { separateurCsv: sep, finDeLigne: fin }: { separateurCsv: string; finDeLigne: string },
): { fichiers: FichierDocument[]; indexPieces: string; manifeste: string; exclus: string[] } {
  if (sep === '' || fin === '') throw new ErreurPaquet('format_invalide', 'Format CSV vide.');
  const champ = (v: string): string => {
    if (v === '') throw new ErreurPaquet('piece_invalide', 'Champ vide.');
    if (v.includes(sep) || v.includes(fin) || /["\n\r]/.test(v)) {
      throw new ErreurPaquet('separateur_dans_nom', 'Séparateur dans un champ.');
    }
    return v;
  };
  const exclus: string[] = [];
  const fichiers: FichierDocument[] = [];
  for (const d of entree.documents) {
    const { mode, exerciceStatut } = entree;
    if (d.nature === 'travail' && !entree.travail) continue;
    if (d.nature === 'officiel') {
      const demande = 'officiel';
      if (!natureAutorisee({ mode, exerciceStatut, demande, type: d.type }).ok) {
        exclus.push(d.nom);
        continue;
      }
    }
    fichiers.push({ nom: d.nom, octets: d.octets });
  }
  const refs = new Set<string>();
  const lignes: string[][] = [];
  for (const p of entree.pieces) {
    if (p.nom === '' || /[/\\\n\r]/.test(p.nom)) throw new ErreurPaquet('nom_invalide', 'Nom invalide.');
    champ(p.nom);
    if (refs.has(p.pieceRef)) throw new ErreurPaquet('piece_en_double', 'Référence en double.');
    refs.add(champ(p.pieceRef));
    if (p.ecritureIds.length === 0) throw new ErreurPaquet('piece_sans_ecriture', 'Aucune écriture.');
    const empreinte = empreinteSha256(p.octets);
    if (empreinte !== p.empreinteOriginale) throw new ErreurPaquet('piece_non_originale', 'Pièce modifiée.');
    for (const e of new Set(p.ecritureIds)) lignes.push([p.pieceRef, champ(e), empreinte]);
    fichiers.push({ nom: p.nom, octets: p.octets });
  }
  lignes.sort((a, b) => comparer(a[0] ?? '', b[0] ?? '') || comparer(a[1] ?? '', b[1] ?? ''));
  const entete = ['PieceRef', 'Ecriture', 'Empreinte'];
  const indexPieces = [entete, ...lignes].map((l) => l.join(sep) + fin).join('');
  if (fichiers.some((f) => f.nom === NOM_INDEX || f.nom === NOM_MANIFESTE)) {
    throw new ErreurPaquet('nom_en_double', 'Nom réservé.');
  }
  fichiers.push({ nom: NOM_INDEX, octets: new TextEncoder().encode(indexPieces) });
  fichiers.sort((a, b) => comparer(a.nom, b.nom));
  try {
    return { fichiers, indexPieces, manifeste: manifeste(fichiers), exclus: exclus.sort() };
  } catch (e) {
    const doublon = e instanceof ErreurDocument && e.code === 'nom_en_double';
    throw new ErreurPaquet(doublon ? 'nom_en_double' : 'nom_invalide', 'Nom de fichier refusé.');
  }
}
