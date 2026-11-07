import { centimes, pourcentage, soustraire, ajouter, type Arrondi, type Centimes } from '../../argent/index.js';
import { ErreurProfil } from '../types.js';

export type Eligibilite = 'eligible' | 'non_eligible' | 'a_confirmer';
export type EntreeIs = { beneficeCentimes: Centimes; dureeMois: number; eligibilite: Eligibilite };
export type ParametresIs = { tauxReduitPdb: number; tauxNormalPdb: number; plafondCentimes: Centimes; arrondi: Arrondi };
export type ResultatIs = {
  statut: 'calcule' | 'a_verifier';
  impotCentimes: Centimes | null;
  partReduite: Centimes;
  partNormale: Centimes;
  motif?: string;
};

const PDB_PLEIN = 10000;
const DUREE_REFERENCE_MOIS = 12;
const ELIGIBILITES: readonly string[] = ['eligible', 'non_eligible', 'a_confirmer'];
const ZERO = centimes(0);

const entier = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n);
const tauxValide = (n: unknown): boolean => entier(n) && n >= 0 && n <= PDB_PLEIN;

function invalide(): never {
  throw new ErreurProfil('entree_invalide');
}

/** Calcul de l'IS : taux, plafond et arrondi viennent toujours des paramètres datés. Aucun prorata. */
export function calculerIs(e: Readonly<EntreeIs>, p: Readonly<ParametresIs>): ResultatIs {
  if (!entier(e.beneficeCentimes) || !entier(e.dureeMois) || e.dureeMois <= 0) invalide();
  if (!ELIGIBILITES.includes(e.eligibilite)) invalide();
  if (!tauxValide(p.tauxReduitPdb) || !tauxValide(p.tauxNormalPdb)) invalide();
  if (!entier(p.plafondCentimes) || p.plafondCentimes < 0) invalide();

  if (e.dureeMois !== DUREE_REFERENCE_MOIS) {
    const motif = e.dureeMois > DUREE_REFERENCE_MOIS ? 'exercice_long_a_verifier' : 'exercice_court_a_verifier';
    return { statut: 'a_verifier', impotCentimes: null, partReduite: ZERO, partNormale: ZERO, motif };
  }
  if (e.beneficeCentimes <= 0) {
    const base = { impotCentimes: ZERO, partReduite: ZERO, partNormale: ZERO };
    return e.eligibilite === 'a_confirmer'
      ? { statut: 'a_verifier', ...base, motif: 'taux_reduit_a_confirmer' }
      : { statut: 'calcule', ...base };
  }
  if (e.eligibilite !== 'eligible') {
    const normale = pourcentage(e.beneficeCentimes, p.tauxNormalPdb, p.arrondi);
    const base = { impotCentimes: normale, partReduite: ZERO, partNormale: normale };
    return e.eligibilite === 'a_confirmer'
      ? { statut: 'a_verifier', ...base, motif: 'taux_reduit_a_confirmer' }
      : { statut: 'calcule', ...base };
  }
  const baseReduite = e.beneficeCentimes < p.plafondCentimes ? e.beneficeCentimes : p.plafondCentimes;
  const partReduite = pourcentage(baseReduite, p.tauxReduitPdb, p.arrondi);
  const partNormale = pourcentage(soustraire(e.beneficeCentimes, baseReduite), p.tauxNormalPdb, p.arrondi);
  return { statut: 'calcule', impotCentimes: ajouter(partReduite, partNormale), partReduite, partNormale };
}
