// Modèle d'écriture comptable et contrôle d'équilibre (montants en centimes).
import { ajouter, centimes, soustraire, type Centimes } from '../argent/index.js';

export type StatutEcriture = 'brouillon' | 'propose' | 'valide';

export interface LigneEcriture {
  compte: string;
  auxiliaire?: string;
  libelle: string;
  debit: Centimes;
  credit: Centimes;
}

export interface Ecriture {
  id: string;
  journal: string;
  date: string;
  statut: StatutEcriture;
  lignes: readonly LigneEcriture[];
  numero?: string;
  type?: 'normale' | 'correction';
  lienOriginale?: string;
  contrePassee?: boolean;
}

export type CodeErreurEcriture =
  | 'ligne_double_sens'
  | 'ligne_nulle'
  | 'montant_negatif'
  | 'une_seule_ligne'
  | 'montant_nul'
  | 'desequilibre';

export class ErreurEcriture extends Error {
  override name = 'ErreurEcriture';
  readonly code: CodeErreurEcriture;
  constructor(code: CodeErreurEcriture, message: string) {
    super(message);
    this.code = code;
  }
}

export interface ResultatEquilibre {
  equilibree: boolean;
  totalDebit: Centimes;
  totalCredit: Centimes;
  ecart: Centimes;
}

/** Refuse une ligne à deux sens, nulle ou négative. */
export function verifierLigne(l: LigneEcriture): void {
  if (l.debit < 0 || l.credit < 0) {
    throw new ErreurEcriture('montant_negatif', 'Un montant de ligne ne peut pas être négatif.');
  }
  if (l.debit !== 0 && l.credit !== 0) {
    throw new ErreurEcriture('ligne_double_sens', 'Une ligne ne peut avoir un débit et un crédit.');
  }
  if (l.debit === 0 && l.credit === 0) {
    throw new ErreurEcriture('ligne_nulle', 'Une ligne ne peut pas être à montant nul.');
  }
}

export function verifierEquilibre(e: Ecriture): ResultatEquilibre {
  let totalDebit = centimes(0);
  let totalCredit = centimes(0);
  for (const l of e.lignes) {
    totalDebit = ajouter(totalDebit, l.debit);
    totalCredit = ajouter(totalCredit, l.credit);
  }
  const ecart = soustraire(totalDebit, totalCredit);
  return { equilibree: ecart === 0, totalDebit, totalCredit, ecart };
}

/** Refuse une écriture à une seule ligne, nulle, à ligne invalide ou déséquilibrée. */
export function verifierEcriture(e: Ecriture): ResultatEquilibre {
  if (e.lignes.length < 2) {
    throw new ErreurEcriture('une_seule_ligne', 'Une écriture demande au moins deux lignes.');
  }
  const tousNuls = e.lignes.every((l) => l.debit === 0 && l.credit === 0);
  if (tousNuls) {
    throw new ErreurEcriture('montant_nul', 'Une écriture à montant nul est refusée.');
  }
  for (const l of e.lignes) verifierLigne(l);
  const r = verifierEquilibre(e);
  if (!r.equilibree) {
    throw new ErreurEcriture('desequilibre', 'Écriture déséquilibrée, écart : ' + String(r.ecart));
  }
  return r;
}
