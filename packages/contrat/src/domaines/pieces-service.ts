import { genererPieces, type PieceFictive } from '../../../donnees-fictives/src/pieces.js';
import type { PieceDetail, PieceResume } from './pieces.js';

export interface FiltrePieces {
  fournisseur?: string | undefined;
  du?: string | undefined;
  au?: string | undefined;
  montantMin?: number | undefined;
  montantMax?: number | undefined;
  etat?: string | undefined;
  type?: string | undefined;
  limite?: number | undefined;
  decalage?: number | undefined;
}

const LIMITE_PAR_DEFAUT = 50;

function normaliser(t: string): string {
  return t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

function valeur(p: PieceFictive, nom: string): string | undefined {
  return p.champs.find((c) => c.nom === nom)?.valeur;
}

function motDe(p: PieceFictive): string {
  if (p.champs.some((c) => c.mot === 'douteux')) return 'douteux';
  return p.etat === 'a_verifier' || p.motifsAVerifier.length > 0 ? 'a_verifier' : 'sur';
}

function resume(p: PieceFictive): PieceResume {
  const r: PieceResume = {
    id: p.id,
    nomNormalise: p.nomNormalise,
    typePiece: p.typePiece,
    etat: p.etat,
    comptee: p.comptee,
    sensible: p.sensible,
    motConfiance: motDe(p),
  };
  const date = valeur(p, 'date_piece');
  const fournisseur = valeur(p, 'fournisseur_nom');
  const ttc = p.champs.find((c) => c.nom === 'ttc')?.valeurCentimes;
  if (date !== undefined) r.datePiece = date;
  if (fournisseur !== undefined) r.fournisseur = fournisseur;
  if (ttc !== undefined) r.ttcCentimes = ttc;
  return r;
}

const trier = (a: PieceFictive, b: PieceFictive): number => (a.recuLe === b.recuLe ? a.id.localeCompare(b.id) : a.recuLe < b.recuLe ? 1 : -1);

/** Liste filtrée (filtres combinés), triée par réception décroissante puis id. */
export function listerPiecesService(f: FiltrePieces): { body: PieceResume[]; decalage: number; total: number } {
  const mot = f.fournisseur === undefined ? undefined : normaliser(f.fournisseur);
  const montant = f.montantMin !== undefined || f.montantMax !== undefined;
  const gardees = genererPieces()
    .pieces.filter((p) => {
      const r = resume(p);
      if (mot !== undefined && !normaliser(r.fournisseur ?? '').includes(mot)) return false;
      if (f.du !== undefined && p.recuLe < f.du) return false;
      if (f.au !== undefined && p.recuLe > f.au) return false;
      if (f.etat !== undefined && p.etat !== f.etat) return false;
      if (f.type !== undefined && p.typePiece !== f.type) return false;
      if (montant) {
        if (r.ttcCentimes === undefined) return false;
        if (f.montantMin !== undefined && r.ttcCentimes < f.montantMin) return false;
        if (f.montantMax !== undefined && r.ttcCentimes > f.montantMax) return false;
      }
      return true;
    })
    .sort(trier);
  const decalage = f.decalage ?? 0;
  return { body: gardees.slice(decalage, decalage + (f.limite ?? LIMITE_PAR_DEFAUT)).map(resume), decalage, total: gardees.length };
}

/** Détail d'une pièce ; une pièce sensible n'expose ni champs ni fournisseur. */
export function detailPiece(id: string): PieceDetail | undefined {
  const p = genererPieces().pieces.find((x) => x.id === id);
  if (p === undefined) return undefined;
  const r = resume(p);
  if (p.sensible) delete r.fournisseur;
  const d: PieceDetail = {
    ...r,
    canal: p.canal,
    recuLe: `${p.recuLe}T00:00:00Z`,
    motifsAVerifier: p.motifsAVerifier,
    champs: p.sensible ? [] : p.champs,
    cheminVirtuel: p.cheminVirtuel,
  };
  if (p.motifNonComptee !== undefined) d.motifNonComptee = p.motifNonComptee;
  return d;
}
