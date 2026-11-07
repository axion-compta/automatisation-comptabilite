// Doublons de pièces en cascade : numéros différents = jamais doublon. Aucune suppression ici.
import type { Centimes } from '../../argent/index.js';

export interface PieceComparee {
  id: string; sha256: string; electronique: boolean; sirenEmetteur?: string | undefined; fournisseurCle?: string | undefined;
  compteFacturation?: string | undefined; prefixe?: string | undefined; numero?: string | undefined; date?: string | undefined; heure?: string | undefined;
  ttc?: Centimes | undefined; texteNormalise?: string | undefined; distanceImage?: number | undefined;
  qualite: 'xml' | 'texte_pdf' | 'photo'; recueLe: string;
}
export interface ResultatDoublon {
  niveau: 1 | 2 | 3 | 4 | 5 | null;
  decision: 'fichier_identique' | 'doublon_sur' | 'collision_numeros' | 'doublon_propose' | 'aucun';
}

const compact = (v: string): string => v.toUpperCase().replace(/[\s\-/.]/g, '');

export function numeroNormalise(numero: string, prefixe?: string): string {
  let n = compact(numero);
  const pre = compact(prefixe ?? '');
  if (pre !== '' && n.startsWith(pre)) n = n.slice(pre.length);
  return n.replace(/^([A-Z]*)0+(?=\d)/, '$1');
}

export function texteNormalise(texte: string): string {
  return texte.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

const present = (v: string | undefined): v is string => v !== undefined && v !== '';
const egal = (a: string | undefined, b: string | undefined): boolean => present(a) && a === b;
const nul = (niveau: null = null): ResultatDoublon => ({ niveau, decision: 'aucun' });

export function comparerPieces(nouvelle: PieceComparee, existante: PieceComparee, options: { distanceImageMax: number }): ResultatDoublon {
  if (egal(nouvelle.sha256, existante.sha256)) return { niveau: 1, decision: 'fichier_identique' };
  const nn = present(nouvelle.numero) ? numeroNormalise(nouvelle.numero, nouvelle.prefixe) : '';
  const ne = present(existante.numero) ? numeroNormalise(existante.numero, existante.prefixe) : '';
  const memeNumero = nn !== '' && nn === ne;
  if (nn !== '' && ne !== '' && !memeNumero) return nul();
  const memeTtc = nouvelle.ttc !== undefined && nouvelle.ttc === existante.ttc;
  if (memeNumero && nouvelle.electronique && existante.electronique && egal(nouvelle.sirenEmetteur, existante.sirenEmetteur) && egal(nouvelle.date, existante.date) && memeTtc) {
    return { niveau: 2, decision: 'doublon_sur' };
  }
  if (memeNumero && egal(nouvelle.fournisseurCle, existante.fournisseurCle) && (nouvelle.compteFacturation ?? '') === (existante.compteFacturation ?? '')) {
    if (memeTtc) return { niveau: 3, decision: 'doublon_sur' };
    if (nouvelle.ttc !== undefined && existante.ttc !== undefined) return { niveau: 3, decision: 'collision_numeros' };
  }
  const ticket = !memeNumero && egal(nouvelle.fournisseurCle, existante.fournisseurCle) && egal(nouvelle.date, existante.date) && memeTtc;
  if (ticket && present(nouvelle.heure) && present(existante.heure)) {
    return nouvelle.heure === existante.heure ? { niveau: 3, decision: 'doublon_sur' } : nul();
  }
  if (egal(nouvelle.texteNormalise, existante.texteNormalise) || ticket) return { niveau: 4, decision: 'doublon_propose' };
  const d = nouvelle.distanceImage;
  if (d !== undefined && d >= 0 && d <= options.distanceImageMax) return { niveau: 5, decision: 'doublon_propose' };
  return nul();
}

const RANG = { xml: 0, texte_pdf: 1, photo: 2 } as const;

export function pieceDeReference(a: PieceComparee, b: PieceComparee): string {
  if (a.qualite !== b.qualite) return RANG[a.qualite] < RANG[b.qualite] ? a.id : b.id;
  if (a.recueLe !== b.recueLe) return a.recueLe < b.recueLe ? a.id : b.id;
  return a.id <= b.id ? a.id : b.id;
}
