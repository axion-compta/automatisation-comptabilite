// IS d'un exercice de plus de 12 mois, calculé par période d'imposition. Le plafond du taux réduit s'apprécie
// période par période et n'est jamais ramené au prorata de la durée. Résultat toujours « à vérifier ».
import { ajouter, pourcentage, soustraire, type Centimes } from '../../argent/index.js';
import { comparerDates, estDateValide } from '../../dates/civiles.js';
import { ErreurProfil } from '../types.js';
import type { Eligibilite, ParametresIs } from './calcul-is.js';

export type PeriodeImposition = { debut: string; fin: string; beneficeCentimes: Centimes; eligibilite: Eligibilite };
export type IsPeriode = {
  debut: string;
  fin: string;
  baseReduiteCentimes: Centimes;
  plafondCentimes: Centimes;
  partReduiteCentimes: Centimes;
  partNormaleCentimes: Centimes;
  impotCentimes: Centimes;
  sources: string[];
};
export type ResultatIsPeriodes = {
  statut: 'a_verifier';
  periodes: IsPeriode[];
  totalCentimes: Centimes;
  sources: string[];
};

const PDB_PLEIN = 10000;
const ELIGIBILITES: readonly string[] = ['eligible', 'non_eligible', 'a_confirmer'];
const entier = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n);
const tauxValide = (n: unknown): boolean => entier(n) && n >= 0 && n <= PDB_PLEIN;

function invalide(): never {
  throw new ErreurProfil('entree_invalide');
}

function verifier(periodes: readonly PeriodeImposition[], p: Readonly<ParametresIs>): void {
  if (!Array.isArray(periodes) || periodes.length === 0) invalide();
  if (!tauxValide(p.tauxReduitPdb) || !tauxValide(p.tauxNormalPdb)) invalide();
  if (!entier(p.plafondCentimes) || p.plafondCentimes < 0) invalide();
  let precedente: string | undefined;
  for (const x of periodes) {
    if (typeof x.debut !== 'string' || typeof x.fin !== 'string' || !estDateValide(x.debut) || !estDateValide(x.fin)) invalide();
    if (comparerDates(x.debut, x.fin) > 0) invalide();
    if (precedente !== undefined && comparerDates(precedente, x.debut) >= 0) invalide();
    if (!entier(x.beneficeCentimes) || !ELIGIBILITES.includes(x.eligibilite)) invalide();
    precedente = x.fin;
  }
}

/** IS par période : taux, plafond et arrondi viennent des paramètres datés ; le plafond entier vaut pour chaque période. */
export function calculerIsParPeriodes(periodes: readonly PeriodeImposition[], p: Readonly<ParametresIs>): ResultatIsPeriodes {
  verifier(periodes, p);
  const zero = soustraire(p.plafondCentimes, p.plafondCentimes);
  let total = zero;
  const calculees = periodes.map((x): IsPeriode => {
    const reduit = x.eligibilite === 'eligible' && x.beneficeCentimes > 0;
    const base = !reduit ? zero : x.beneficeCentimes < p.plafondCentimes ? x.beneficeCentimes : p.plafondCentimes;
    const taxable = x.beneficeCentimes > 0 ? x.beneficeCentimes : zero;
    const partReduite = pourcentage(base, p.tauxReduitPdb, p.arrondi);
    const partNormale = pourcentage(soustraire(taxable, base), p.tauxNormalPdb, p.arrondi);
    const impot = ajouter(partReduite, partNormale);
    total = ajouter(total, impot);
    return {
      debut: x.debut,
      fin: x.fin,
      baseReduiteCentimes: base,
      plafondCentimes: p.plafondCentimes,
      partReduiteCentimes: partReduite,
      partNormaleCentimes: partNormale,
      impotCentimes: impot,
      sources: [`periode:${x.debut}/${x.fin}`, 'plafond_entier_par_periode', `eligibilite:${x.eligibilite}`],
    };
  });
  return { statut: 'a_verifier', periodes: calculees, totalCentimes: total, sources: ['calcul_is_par_periodes', 'parametres_dates'] };
}
