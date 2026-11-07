// TVA : part déductible et écart entre TVA lue et TVA attendue.
// Aucune valeur légale ici : taux et parts arrivent en arguments (points de base, 100 = 1 %).
import { type Centimes, pourcentage, soustraire } from '../argent/index.js';

export class ErreurTva extends Error {
  override name = 'ErreurTva';
  readonly code: 'part_invalide' | 'montant_negatif';
  constructor(code: 'part_invalide' | 'montant_negatif', message: string) {
    super(message);
    this.code = code;
  }
}

const PART_MAX = 10000;

export interface PartDeductible {
  deductible: Centimes;
  nonDeductible: Centimes;
}

/** Sépare la TVA retenue en part déductible (arrondie au centime, demi vers le haut) et part en charge. */
export function partDeductible(tvaRetenue: Centimes, partPointsDeBase: number): PartDeductible {
  if (!Number.isSafeInteger(partPointsDeBase) || partPointsDeBase < 0 || partPointsDeBase > PART_MAX) {
    throw new ErreurTva('part_invalide', 'La part doit être un entier de 0 à 10000 points de base');
  }
  const deductible = pourcentage(tvaRetenue, partPointsDeBase, 'demi-superieur');
  return { deductible, nonDeductible: soustraire(tvaRetenue, deductible) };
}

export interface EntreeEcartTva {
  base: Centimes;
  tauxPointsDeBase: number;
  tvaLue: Centimes;
}

export interface ResultatEcartTva {
  tvaRetenue: Centimes;
  tvaAttendue: Centimes;
  ecart: Centimes;
  carte: boolean;
}

/** La facture fait foi : la TVA retenue est la TVA lue. Un écart de plus d'un centime lève une carte, sans correction. */
export function ecartTva(entree: EntreeEcartTva): ResultatEcartTva {
  const tvaAttendue = pourcentage(entree.base, entree.tauxPointsDeBase, 'demi-superieur');
  const ecart = soustraire(entree.tvaLue, tvaAttendue);
  return { tvaRetenue: entree.tvaLue, tvaAttendue, ecart, carte: Math.abs(ecart) > 1 };
}
