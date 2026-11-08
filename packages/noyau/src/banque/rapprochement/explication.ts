// Explication d'une ligne rapprochée : codes et valeurs seulement, aucune phrase (les textes viennent de packages/textes).
import type { EtatRapprochement, Lien, LigneBancaire } from '../types.js';

export class ErreurExplication extends Error {
  override name = 'ErreurExplication';
  constructor(readonly code: 'lien_etranger' | 'borne_invalide' | 'candidat_invalide') {
    super(code);
  }
}

export type CodeMot = 'rattache' | 'propose' | 'hesite' | 'sans_piece' | 'a_qualifier' | 'neutralisee' | 'ignoree';
export type Valeurs = Record<string, string | number>;
export type Candidat = { pieceId: string; score: number };
export type FacteurExpliquee = { nom: string; points: number; code: string; valeurs: Valeurs };
export type Explication = {
  codeMot: CodeMot; score?: number; etat: EtatRapprochement; passe?: number; facteurs: FacteurExpliquee[];
  autresCandidats: Candidat[]; proposePar?: Lien['proposePar'];
};

const CODE_PAR_ETAT: Record<EtatRapprochement, CodeMot> = {
  RAPPROCHEE: 'rattache', PROPOSEE: 'propose', DOUTEUSE: 'hesite', SANS_PIECE: 'sans_piece', SANS_PIECE_REQUISE: 'sans_piece',
  A_QUALIFIER: 'a_qualifier', NEUTRALISEE: 'neutralisee', PERSO: 'neutralisee', IGNOREE: 'ignoree',
};
const FORME_IBAN = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/;
const ressembleIban = (v: string): boolean => FORME_IBAN.test(v.replace(/\s+/g, '').toUpperCase());
const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

function nettoyer(valeurs: Valeurs | undefined): Valeurs {
  const sortie: Valeurs = {};
  for (const [cle, v] of Object.entries(valeurs ?? {})) {
    if (typeof v === 'string' ? !ressembleIban(v) : Number.isFinite(v)) sortie[cle] = v;
  }
  return sortie;
}

export function expliquer(
  ligne: LigneBancaire,
  lien: Lien | undefined,
  candidats: readonly Candidat[],
  maxAutres: number,
  valeurs: Readonly<Record<string, Valeurs>> = {},
): Explication {
  if (!Number.isSafeInteger(maxAutres) || maxAutres < 0) throw new ErreurExplication('borne_invalide');
  if (candidats.some((c) => !Number.isFinite(c.score))) throw new ErreurExplication('candidat_invalide');
  if (lien !== undefined && lien.ligneId !== ligne.id) throw new ErreurExplication('lien_etranger');
  const autresCandidats = candidats
    .filter((c) => c.pieceId !== lien?.pieceId)
    .sort((a, b) => b.score - a.score || cmp(a.pieceId, b.pieceId))
    .slice(0, maxAutres)
    .map((c) => ({ pieceId: c.pieceId, score: c.score }));
  const base = { codeMot: CODE_PAR_ETAT[ligne.etatRapprochement], etat: ligne.etatRapprochement, autresCandidats };
  if (lien === undefined) return { ...base, facteurs: [] };
  return {
    ...base,
    score: lien.score,
    passe: lien.passe,
    proposePar: lien.proposePar,
    facteurs: lien.facteurs.map((f) => ({ nom: f.nom, points: f.points, code: f.code, valeurs: nettoyer(valeurs[f.nom]) })),
  };
}
