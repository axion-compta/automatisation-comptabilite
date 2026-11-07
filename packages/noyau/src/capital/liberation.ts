// Capital : parts entières égales au capital, libération minimale du numéraire, condition « capital entièrement libéré ».
// Aucune valeur légale ici : la fraction minimale arrive en argument (points de base, 10000 = 100 %).
import { centimes, pourcentage, soustraire, type Centimes } from '../argent/index.js';

export type CodeErreurCapital = 'entree_invalide' | 'verse_superieur' | 'montant_invalide';

export class ErreurCapital extends Error {
  override name = 'ErreurCapital';
  readonly code: CodeErreurCapital;
  constructor(code: CodeErreurCapital, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

const FRACTION_MAX = 10000;

function entierPositifOuNul(valeur: number): boolean {
  return Number.isSafeInteger(valeur) && valeur >= 0;
}

export interface AssocieParts {
  id: string;
  parts: number;
}

/** La somme des parts des associés doit égaler les parts du capital ; `ecart` = somme moins parts du capital. */
export function controlePartsCapital(
  associes: readonly AssocieParts[],
  partsCapital: number,
): { ok: boolean; ecart: number } {
  if (!Number.isSafeInteger(partsCapital) || partsCapital <= 0) {
    throw new ErreurCapital('entree_invalide', 'Les parts du capital doivent être un entier strictement positif.');
  }
  let somme = 0;
  for (const a of associes) {
    if (!entierPositifOuNul(a.parts)) {
      throw new ErreurCapital('entree_invalide', 'Les parts d\'un associé doivent être un entier positif ou nul.');
    }
    somme += a.parts;
  }
  if (!Number.isSafeInteger(somme)) {
    throw new ErreurCapital('entree_invalide', 'Somme des parts hors limites.');
  }
  const ecart = somme - partsCapital;
  return { ok: ecart === 0, ecart };
}

export interface ResultatLiberation {
  suffisante: boolean;
  minimum: Centimes;
  manque: Centimes;
  resteALiberer: Centimes;
}

/** Libération du numéraire : le minimum est arrondi vers le haut ; un apport en nature n'entre pas ici. */
export function liberationMinimale(
  situation: { apportsNumeraire: Centimes; verse: Centimes },
  fractionMinPointsDeBase: number,
): ResultatLiberation {
  const { apportsNumeraire, verse } = situation;
  if (!entierPositifOuNul(apportsNumeraire) || !entierPositifOuNul(verse)) {
    throw new ErreurCapital('entree_invalide', 'Les montants doivent être des centimes entiers positifs ou nuls.');
  }
  if (!Number.isSafeInteger(fractionMinPointsDeBase) || fractionMinPointsDeBase < 0 || fractionMinPointsDeBase > FRACTION_MAX) {
    throw new ErreurCapital('entree_invalide', 'La fraction doit être un entier de 0 à 10000 points de base.');
  }
  if (verse > apportsNumeraire) {
    throw new ErreurCapital('verse_superieur', 'Le versé ne peut pas dépasser les apports.');
  }
  const minimum = pourcentage(apportsNumeraire, fractionMinPointsDeBase, 'superieur');
  const suffisante = verse >= minimum;
  return {
    suffisante,
    minimum,
    manque: suffisante ? centimes(0) : soustraire(minimum, verse),
    resteALiberer: soustraire(apportsNumeraire, verse),
  };
}

/** Une des conditions du taux réduit d'IS : capital entièrement libéré (les autres ne sont pas évaluées ici). */
export function conditionCapitalLibere(situation: {
  capital: Centimes;
  libere: Centimes;
}): { remplie: boolean; code?: 'capital_non_entierement_libere' } {
  const { capital, libere } = situation;
  if (!Number.isSafeInteger(capital) || capital <= 0 || !entierPositifOuNul(libere)) {
    throw new ErreurCapital('entree_invalide', 'Capital et libéré doivent être des centimes entiers valides.');
  }
  if (libere > capital) {
    throw new ErreurCapital('verse_superieur', 'Le libéré ne peut pas dépasser le capital.');
  }
  if (libere === capital) return { remplie: true };
  return { remplie: false, code: 'capital_non_entierement_libere' };
}
