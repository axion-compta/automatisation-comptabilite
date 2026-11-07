// Écriture de liquidation de TVA d'une période : solde collectée et déductible.
// Les numéros de compte arrivent en argument, aucun n'est écrit ici.
import { soustraire, type Centimes } from '../argent/index.js';
import { verifierEcriture, type Ecriture, type LigneEcriture } from '../ecritures/modele.js';
import { ErreurTva } from './deductible.js';

export interface TotauxTva {
  collectee: Centimes;
  deductible: Centimes;
}

export interface ComptesLiquidation {
  collectee: string;
  deductible: string;
  aPayer: string;
  credit: string;
}

export interface IdentiteLiquidation {
  id: string;
  journal: string;
  date: string;
}

const LIBELLE = 'Liquidation de TVA';

function ligne(compte: string, debit: Centimes | 0, credit: Centimes | 0): LigneEcriture {
  return { compte, libelle: LIBELLE, debit: debit as Centimes, credit: credit as Centimes };
}

/** Solde la TVA collectée et déductible vers la TVA à payer ou le crédit de TVA. Renvoie null si rien à liquider. */
export function liquiderTva(
  totaux: TotauxTva,
  comptes: ComptesLiquidation,
  identite: IdentiteLiquidation,
): Ecriture | null {
  const { collectee, deductible } = totaux;
  if (collectee < 0 || deductible < 0) {
    throw new ErreurTva('montant_negatif', 'Un montant de TVA ne peut pas être négatif.');
  }
  if (collectee === 0 && deductible === 0) return null;

  const lignes: LigneEcriture[] = [];
  if (collectee > 0) lignes.push(ligne(comptes.collectee, collectee, 0));
  if (collectee >= deductible) {
    if (deductible > 0) lignes.push(ligne(comptes.deductible, 0, deductible));
    const aPayer = soustraire(collectee, deductible);
    if (aPayer > 0) lignes.push(ligne(comptes.aPayer, 0, aPayer));
  } else {
    lignes.push(ligne(comptes.credit, soustraire(deductible, collectee), 0));
    lignes.push(ligne(comptes.deductible, 0, deductible));
  }

  const ecriture: Ecriture = { id: identite.id, journal: identite.journal, date: identite.date, statut: 'brouillon', lignes };
  verifierEcriture(ecriture);
  return ecriture;
}
