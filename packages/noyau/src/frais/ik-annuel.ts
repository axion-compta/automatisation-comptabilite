// IK annuelles : formule de la tranche du cumul, puis régularisation. Tout vient du barème daté.
import { centimes, pourcentage, soustraire, type Centimes } from '../argent/index.js';
import type { PuissanceIk } from './bareme-ik.js';
import { ErreurFrais } from './types.js';

// cumul (dixièmes) × taux (millièmes) est en dix-millièmes d'euro ; le fixe en centimes passe à cette échelle.
const DIXMILLIEMES_PAR_CENTIME = 100;
const BASE_POURCENT = 100;

export interface EntreeIkAnnuel {
  cumulDixiemes: number;
  ligne: PuissanceIk;
  majorationPourcent: number;
  electrique: boolean;
}

function invalide(message: string): never {
  throw new ErreurFrais('entree_invalide', message);
}

/** Montant annuel : tranche dont la borne est ≥ au cumul (incluse), sinon la dernière ; un seul arrondi. */
export function montantAnnuel(e: EntreeIkAnnuel): Centimes {
  const { cumulDixiemes: d, majorationPourcent: m } = e;
  if (!Number.isSafeInteger(d) || d < 0) invalide('cumul de kilomètres invalide');
  if (!Number.isSafeInteger(m) || m < 0) invalide('majoration invalide');
  if (d === 0) return centimes(0);
  const { tranches } = e.ligne;
  const tranche = tranches.find((t) => t.jusquaKmDixiemes === null || t.jusquaKmDixiemes >= d) ?? tranches[tranches.length - 1];
  if (!tranche) invalide('aucune tranche');
  const brut = d * tranche.tauxMilliemes + tranche.fixeCentimes * DIXMILLIEMES_PAR_CENTIME;
  if (!Number.isSafeInteger(brut)) invalide('montant hors limites');
  const majoration = e.electrique ? m : 0;
  return pourcentage(centimes(brut), BASE_POURCENT + majoration, 'demi-superieur');
}

/** Montant annuel moins somme des provisoires (signé). */
export function regularisation(annuel: Centimes, provisoires: readonly Centimes[]): Centimes {
  return provisoires.reduce((reste, p) => soustraire(reste, p), annuel);
}
