// Huit blocs indépendants, enveloppe commune (TB-R5 à TB-R7). Codes seulement, aucun texte affiché.
import { CODES_BLOC, type CodeBloc, type EtatBloc, type GraviteAlerte, type Periode } from '../interface/types.js';

export class ErreurBloc extends Error {
  readonly code: 'pieces_en_doute_invalides';
  constructor(code: 'pieces_en_doute_invalides') {
    super(code);
    this.name = 'ErreurBloc';
    this.code = code;
  }
}

export interface EnveloppeBloc<T> {
  code: CodeBloc;
  etat: EtatBloc;
  mot: string;
  gravite?: GraviteAlerte;
  periode: Periode;
  donnees?: T;
  lien?: string;
}

export function construireBloc<T>(code: CodeBloc, periode: Periode, calcul: () => T | undefined): EnveloppeBloc<T> {
  let valeur: T | undefined;
  try {
    valeur = calcul();
  } catch {
    return { code, etat: 'impossible', mot: 'calcul_impossible', periode };
  }
  if (valeur === undefined) return { code, etat: 'vide', mot: 'vide_' + code, periode };
  return { code, etat: 'ok', mot: 'ok_' + code, periode, donnees: valeur };
}

/** TVA : tant qu'une pièce est en doute, aucun montant et le calcul n'est pas appelé. */
export function blocTva<T>(
  periode: Periode,
  piecesEnDoute: number,
  calcul: () => T | undefined,
): EnveloppeBloc<T | { piecesEnDoute: number }> {
  if (typeof piecesEnDoute !== 'number' || !Number.isInteger(piecesEnDoute) || piecesEnDoute < 0) {
    throw new ErreurBloc('pieces_en_doute_invalides');
  }
  if (piecesEnDoute > 0) {
    return {
      code: 'tva_impots',
      etat: 'impossible',
      mot: 'pieces_a_regarder',
      gravite: 'a_faire',
      periode,
      donnees: { piecesEnDoute },
    };
  }
  return construireBloc('tva_impots', periode, calcul);
}

export function assemblerTableau(
  periode: Periode,
  calculs: Partial<Record<CodeBloc, () => unknown>>,
): EnveloppeBloc<unknown>[] {
  return CODES_BLOC.map((code) => construireBloc(code, periode, calculs[code] ?? (() => undefined)));
}
