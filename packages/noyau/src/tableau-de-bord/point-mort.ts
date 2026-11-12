// Point mort recalculé depuis les écritures validées (centimes).
// Les classes de comptes sont un argument : aucun numéro de compte n'est écrit ici.
import { centimes, fraction, proportionPointsDeBase, soustraire, type Centimes } from '../argent/index.js';
import type { Ecriture } from '../ecritures/modele.js';
import { balance } from '../livres/balance.js';
import type { Periode } from './chiffres.js';

export interface ClassesPointMort {
  ca: { prefixes: string[]; deduire: string[] };
  /** Préfixes des comptes de charges fixes. */
  fixes: string[];
  /** Préfixes des comptes de charges variables. */
  variables: string[];
}

export interface PointMort {
  mot: 'estimation';
  /** `vide` : aucune écriture validée sur la période ; `impossible` : marge sur coûts variables nulle ou négative. */
  statut: 'calcule' | 'impossible' | 'vide';
  chiffreAffaires: Centimes;
  chargesFixes: Centimes;
  chargesVariables: Centimes;
  /** Taux de marge sur coûts variables, en points de base ; `null` s'il n'existe pas. */
  tauxMarge: number | null;
  pointMort: Centimes | null;
}

const commence = (compte: string, prefixes: readonly string[]): boolean => prefixes.some((p) => p !== '' && compte.startsWith(p));

export function calculerPointMort(ecritures: readonly Ecriture[], periode: Periode, classes: ClassesPointMort): PointMort {
  const dans = ecritures.filter((e) => e.statut === 'valide' && e.date >= periode.debut && e.date <= periode.fin);
  const lignes = balance(dans).lignes;
  const somme = (retenir: (compte: string) => boolean): Centimes =>
    lignes.reduce((s, l) => (retenir(l.compte) ? centimes(s + l.solde) : s), centimes(0));
  const ventes = somme((c) => commence(c, classes.ca.prefixes) && !commence(c, classes.ca.deduire));
  const ca = soustraire(soustraire(centimes(0), ventes), somme((c) => commence(c, classes.ca.deduire)));
  const fixes = somme((c) => commence(c, classes.fixes));
  const variables = somme((c) => commence(c, classes.variables));
  const base = { mot: 'estimation' as const, chiffreAffaires: ca, chargesFixes: fixes, chargesVariables: variables };
  if (dans.length === 0) return { ...base, statut: 'vide', tauxMarge: null, pointMort: null };

  const marge = soustraire(ca, variables);
  if (ca <= 0 || marge <= 0) return { ...base, statut: 'impossible', tauxMarge: null, pointMort: null };
  // Point mort = charges fixes / taux de marge = charges fixes x CA / marge (un seul arrondi, par excès).
  return {
    ...base,
    statut: 'calcule',
    tauxMarge: proportionPointsDeBase(marge, ca, 'demi-superieur'),
    pointMort: fraction(fixes, ca, marge, 'superieur'),
  };
}
