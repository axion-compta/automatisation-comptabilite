// Registre des immobilisations : fiche d'un bien (montants en centimes entiers).
import type { Centimes } from '../argent/index.js';
import { estDateValide } from '../dates/civiles.js';

export type CodeErreurImmobilisation =
  | 'duree_invalide'
  | 'base_invalide'
  | 'date_invalide'
  | 'cumul_invalide'
  | 'compte_non_amortissable';

export class ErreurImmobilisation extends Error {
  override name = 'ErreurImmobilisation';
  readonly code: CodeErreurImmobilisation;
  constructor(code: CodeErreurImmobilisation) {
    super(code);
    this.code = code;
  }
}

export interface Bien {
  id: string;
  /** Compte d'immobilisation (classe 2). */
  compte: string;
  libelle: string;
  /** Date de mise en service, AAAA-MM-JJ. */
  miseEnService: string;
  base: Centimes;
  /** Durée d'amortissement en mois ; sans objet pour un bien non amortissable. */
  dureeMois: number;
  amortissable: boolean;
}

/** Crée la fiche d'un bien : base strictement positive, date valide, durée entière positive si amortissable. */
export function creerBien(saisie: Bien): Bien {
  if (!estDateValide(saisie.miseEnService)) throw new ErreurImmobilisation('date_invalide');
  if (saisie.base <= 0) throw new ErreurImmobilisation('base_invalide');
  if (saisie.amortissable && !(Number.isSafeInteger(saisie.dureeMois) && saisie.dureeMois > 0)) {
    throw new ErreurImmobilisation('duree_invalide');
  }
  return { ...saisie };
}
