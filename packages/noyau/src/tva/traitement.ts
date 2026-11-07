// Effet de chaque code de traitement de TVA sur une ligne.
// Le code arrive déjà choisi ; aucun taux ni part n'est écrit ici.
import { pourcentage, type Centimes } from '../argent/index.js';
import { partDeductible } from './deductible.js';

export type CodeTraitement =
  | 'DEDUCTIBLE'
  | 'AUTOLIQUIDATION'
  | 'AUTOLIQUIDATION_FR'
  | 'A_VERIFIER'
  | 'NON_DEDUCTIBLE_NOM'
  | 'NON_DEDUCTIBLE_NATURE'
  | 'NON_DEDUCTIBLE_ETRANGERE'
  | 'SANS_TVA'
  | 'MARGE'
  | 'SOUS_RESERVE';

export type CodeErreurTraitementTva = 'code_inconnu' | 'taux_manquant' | 'tva_sur_sans_tva' | 'montant_invalide';

export class ErreurTraitementTva extends Error {
  override name = 'ErreurTraitementTva';
  readonly code: CodeErreurTraitementTva;
  constructor(code: CodeErreurTraitementTva, message: string) {
    super(message);
    this.code = code;
  }
}

export interface EntreeTraitement {
  code: CodeTraitement;
  sens: 'achat' | 'vente';
  tvaLue: Centimes;
  base: Centimes;
  tauxAutoliquidationPointsDeBase?: number;
  /** Part déductible en points de base ; omise = déductible en totalité. */
  partPointsDeBase?: number;
  franchise: boolean;
}

export interface EffetTraitement {
  collectee: Centimes;
  deductible: Centimes;
  sousReserve: Centimes;
  perdue: Centimes;
  aVerifier: boolean;
}

const CODES: readonly string[] = [
  'DEDUCTIBLE',
  'AUTOLIQUIDATION',
  'AUTOLIQUIDATION_FR',
  'A_VERIFIER',
  'NON_DEDUCTIBLE_NOM',
  'NON_DEDUCTIBLE_NATURE',
  'NON_DEDUCTIBLE_ETRANGERE',
  'SANS_TVA',
  'MARGE',
  'SOUS_RESERVE',
];

const PART_TOTALE = 10000;

function effet(partiel: Partial<EffetTraitement>): EffetTraitement {
  return { collectee: 0 as Centimes, deductible: 0 as Centimes, sousReserve: 0 as Centimes, perdue: 0 as Centimes, aVerifier: false, ...partiel };
}

function montantValide(valeur: number): boolean {
  return Number.isSafeInteger(valeur) && valeur >= 0;
}

/** Ventile la TVA d'une ligne entre collectée, déductible, sous réserve et perdue. */
export function effetTraitement(entree: EntreeTraitement): EffetTraitement {
  const { code, sens, tvaLue, base, franchise } = entree;
  if (!CODES.includes(code)) throw new ErreurTraitementTva('code_inconnu', `Code de traitement inconnu : « ${String(code)} ».`);
  if (sens !== 'achat' && sens !== 'vente') throw new ErreurTraitementTva('code_inconnu', `Sens inconnu : « ${String(sens)} ».`);
  if (!montantValide(tvaLue) || !montantValide(base)) {
    throw new ErreurTraitementTva('montant_invalide', 'La base et la TVA lue doivent être des entiers positifs ou nuls.');
  }

  switch (code) {
    case 'A_VERIFIER':
    case 'MARGE':
      return effet({ aVerifier: true });
    case 'SANS_TVA':
      if (tvaLue > 0) throw new ErreurTraitementTva('tva_sur_sans_tva', 'Une ligne sans TVA ne peut pas porter de TVA.');
      return effet({});
    case 'DEDUCTIBLE': {
      if (sens === 'vente') return effet({ collectee: tvaLue });
      const part = partDeductible(tvaLue, entree.partPointsDeBase ?? PART_TOTALE);
      return effet({ deductible: part.deductible, perdue: part.nonDeductible });
    }
    default:
      break;
  }

  // Les codes restants ne valent que pour un achat : sur une vente, c'est un doute.
  if (sens === 'vente') return effet({ aVerifier: true });

  switch (code) {
    case 'SOUS_RESERVE':
      return effet({ sousReserve: tvaLue });
    case 'AUTOLIQUIDATION':
    case 'AUTOLIQUIDATION_FR': {
      const taux = entree.tauxAutoliquidationPointsDeBase;
      if (taux === undefined) throw new ErreurTraitementTva('taux_manquant', "Le taux d'autoliquidation est requis.");
      if (!montantValide(taux)) throw new ErreurTraitementTva('montant_invalide', "Le taux d'autoliquidation est invalide.");
      const tva = pourcentage(base, taux, 'demi-superieur');
      return franchise ? effet({ collectee: tva, perdue: tva }) : effet({ collectee: tva, deductible: tva });
    }
    default:
      return effet({ perdue: tvaLue });
  }
}
