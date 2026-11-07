// Contrôle CC-T02 : la TVA d'une période en doute bloque la préparation, sans estimation.
// Règle pure : codes seulement, aucun texte affiché.
import { ajouter, type Centimes } from '../../argent/index.js';
import type { CodeTraitement } from '../../tva/traitement.js';
import type { RegleControle, SortieRegle } from '../moteur.js';
import { alerte, ErreurControle, exigerCentimes, ok, parametreUtilisable, type ParametreLu } from './commun.js';

export interface PieceTva {
  pieceId: string;
  lue: boolean;
  lisible: boolean;
  codes: readonly CodeTraitement[];
  parametresUtilises: readonly ParametreLu[];
  casParticulier: boolean;
  quarantaine: boolean;
  destinataireAConfirmer: boolean;
  tvaEnJeu: Centimes;
}

export type MotifDoute =
  | 'non_lue'
  | 'illisible'
  | 'a_verifier'
  | 'parametre_a_verifier'
  | 'cas_particulier'
  | 'contenu_suspect'
  | 'destinataire';

export interface PiecesEnDoute {
  nombre: number;
  tvaEnJeu: Centimes;
  pieces: { pieceId: string; motifs: MotifDoute[] }[];
}

/** Motifs de doute d'une pièce, triés par ordre alphabétique. */
export function motifsDoute(p: PieceTva): MotifDoute[] {
  const motifs: MotifDoute[] = [];
  if (!p.lue) motifs.push('non_lue');
  if (!p.lisible) motifs.push('illisible');
  if (p.codes.includes('A_VERIFIER')) motifs.push('a_verifier');
  if (p.parametresUtilises.some((x) => !parametreUtilisable(x))) motifs.push('parametre_a_verifier');
  if (p.casParticulier) motifs.push('cas_particulier');
  if (p.quarantaine) motifs.push('contenu_suspect');
  if (p.destinataireAConfirmer) motifs.push('destinataire');
  return motifs.sort();
}

export function piecesEnDoute(pieces: readonly PieceTva[]): PiecesEnDoute {
  let total = exigerCentimes(0);
  const doutes: PiecesEnDoute['pieces'] = [];
  for (const p of pieces) {
    const enJeu = exigerCentimes(p.tvaEnJeu);
    if (enJeu < 0) throw new ErreurControle('entree_invalide');
    const motifs = motifsDoute(p);
    if (motifs.length === 0) continue;
    total = ajouter(total, enJeu);
    doutes.push({ pieceId: p.pieceId, motifs });
  }
  doutes.sort((a, b) => (a.pieceId < b.pieceId ? -1 : a.pieceId > b.pieceId ? 1 : 0));
  return { nombre: doutes.length, tvaEnJeu: total, pieces: doutes };
}

export const regleCCT02: RegleControle<{ periode: string; pieces: readonly PieceTva[] }> = {
  id: 'CC-T02',
  version: 1,
  gravite: 'B',
  bloque: ['tva'],
  declencheurs: ['arrivee', 'continu', 'nocturne', 'avant_tva', 'a_la_demande'],
  actif: true,
  evaluer({ pieces }): SortieRegle {
    const r = piecesEnDoute(pieces);
    return r.nombre > 0 ? alerte(r.tvaEnJeu, r.nombre) : ok();
  },
};
