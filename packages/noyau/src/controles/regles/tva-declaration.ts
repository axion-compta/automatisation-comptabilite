// Contrôles de déclaration TVA-C09, TVA-C10, TVA-C11, TVA-C13 (centimes, règles pures).
// Aucun texte affiché ici : seulement des codes et des écarts. Seuil et codes de ligne viennent de l'appelant.
import { centimes, soustraire, type Centimes } from '../../argent/index.js';
import type { CaseDeclaration } from '../../declarations/cases.js';
import { reporterCredit } from '../../declarations/report.js';
import type { RegleControle, SortieRegle } from '../moteur.js';

/** Une entrée inutilisable (NaN, non entier, ligne absente) donne IMPOSSIBLE, jamais OK. */
function sansRisque(calcul: () => SortieRegle): SortieRegle {
  try {
    return calcul();
  } catch {
    return { resultat: 'IMPOSSIBLE' };
  }
}

function sortieEcart(ecart: Centimes, valeur: Centimes): SortieRegle {
  return ecart === 0 ? { resultat: 'OK', valeur } : { resultat: 'ALERTE', valeur, ecartCentimes: ecart };
}

export interface ObjetTvaC09 {
  caDeclareCumule: Centimes;
  totalComptesProduits: Centimes;
  /** Paramètre daté `tva.controle.seuil_ecart_ca`, lu par l'appelant. */
  seuilEcart: Centimes;
}

/** TVA-C09 : CA déclaré de l'année contre total des comptes de produits ; alerte au-delà du seuil (strict). */
export const regleTvaC09: RegleControle<ObjetTvaC09> = {
  id: 'TVA-C09',
  version: 1,
  gravite: 'M',
  bloque: [],
  declencheurs: ['avant_tva'],
  actif: true,
  evaluer: (o) =>
    sansRisque(() => {
      const seuil = centimes(o.seuilEcart);
      if (seuil < 0) return { resultat: 'IMPOSSIBLE' };
      const ecart = soustraire(centimes(o.caDeclareCumule), centimes(o.totalComptesProduits));
      if (Math.abs(ecart) <= seuil) return { resultat: 'OK', valeur: ecart };
      return { resultat: 'ALERTE', valeur: ecart, ecartCentimes: ecart };
    }),
};

export interface ObjetTvaC10 {
  precedente: readonly CaseDeclaration[] | null;
  actuelle: readonly CaseDeclaration[];
  codes: { ligneCredit: string; ligneReport: string };
}

/** TVA-C10 : la ligne de report égale la ligne de crédit de la déclaration précédente. */
export const regleTvaC10: RegleControle<ObjetTvaC10> = {
  id: 'TVA-C10',
  version: 1,
  gravite: 'B',
  bloque: ['tva'],
  declencheurs: ['avant_tva'],
  actif: true,
  evaluer: (o) =>
    sansRisque(() => {
      const attendu = reporterCredit(o.precedente, o.codes); // lève si lignes absentes ou identiques
      const lue = o.actuelle.find((x) => x.code === o.codes.ligneReport);
      if (lue === undefined) return { resultat: 'IMPOSSIBLE' };
      return sortieEcart(soustraire(centimes(lue.montant), attendu.montant), attendu.montant);
    }),
};

export interface ObjetTvaC11 {
  soldeCollectee: Centimes;
  soldeDeductible: Centimes;
  tvaNetteDeclaree: Centimes;
}

/** TVA-C11 : solde collectée moins solde déductible égale la TVA nette de la déclaration préparée. */
export const regleTvaC11: RegleControle<ObjetTvaC11> = {
  id: 'TVA-C11',
  version: 1,
  gravite: 'B',
  bloque: ['tva'],
  declencheurs: ['avant_tva'],
  actif: true,
  evaluer: (o) =>
    sansRisque(() => {
      const calculee = soustraire(centimes(o.soldeCollectee), centimes(o.soldeDeductible));
      return sortieEcart(soustraire(centimes(o.tvaNetteDeclaree), calculee), calculee);
    }),
};

export interface CaseCalculee {
  code: string;
  montant: Centimes;
  /** Vrai pour une case de base (assiette). */
  base: boolean;
}

/** TVA-C13 : aucune case de base négative ; la valeur est la somme des bases négatives. */
export const regleTvaC13: RegleControle<{ cases: readonly CaseCalculee[] }> = {
  id: 'TVA-C13',
  version: 1,
  gravite: 'B',
  bloque: ['tva'],
  declencheurs: ['avant_tva'],
  actif: true,
  evaluer: (o) =>
    sansRisque(() => {
      const negatives = o.cases.filter((x) => x.base && centimes(x.montant) < 0);
      const somme = negatives.reduce((total, x) => total + x.montant, 0) as Centimes;
      return negatives.length > 0 ? { resultat: 'ALERTE', valeur: somme, ecartCentimes: somme } : { resultat: 'OK', valeur: somme };
    }),
};

export const reglesTvaDeclaration = {
  'TVA-C09': regleTvaC09,
  'TVA-C10': regleTvaC10,
  'TVA-C11': regleTvaC11,
  'TVA-C13': regleTvaC13,
} as const;
