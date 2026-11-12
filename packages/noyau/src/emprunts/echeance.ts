// Échéance d'emprunt repérée sur le relevé : même montant au centime, date dans une fenêtre en jours.
import { ajouter, type Centimes } from '../argent/index.js';
import { estDateValide, ajouterJours, comparerDates } from '../dates/civiles.js';

export type CodeErreurEmprunt = 'fenetre_invalide' | 'date_invalide' | 'tableau_incoherent' | 'somme_differente' | 'pas_un_debit';

export class ErreurEmprunt extends Error {
  override name = 'ErreurEmprunt';
  constructor(readonly code: CodeErreurEmprunt) {
    super(code);
  }
}

/** Une ligne du tableau d'amortissement (montants positifs en centimes). */
export type Echeance = { readonly date: string; readonly capital: Centimes; readonly interets: Centimes; readonly assurance: Centimes };
export type LigneReleve = { readonly dateOperation: string; readonly montant: Centimes };

export const FENETRE_PAR_DEFAUT = 3;

/** Total de l'échéance, ou undefined si une part est négative, non entière ou si le total est nul. */
export function totalEcheance(e: Echeance): Centimes | undefined {
  const parts = [e.capital, e.interets, e.assurance];
  if (!parts.every((p) => Number.isSafeInteger(p) && p >= 0)) return undefined;
  const total = ajouter(ajouter(e.capital, e.interets), e.assurance);
  return total > 0 ? total : undefined;
}

/** Rend l'échéance du tableau dont le total égale le débit et dont la date est à `fenetreJours` jours au plus. */
export function reconnaitreEcheance(ligne: LigneReleve, tableau: readonly Echeance[], fenetreJours: number = FENETRE_PAR_DEFAUT): Echeance | undefined {
  if (!Number.isSafeInteger(fenetreJours) || fenetreJours < 0) throw new ErreurEmprunt('fenetre_invalide');
  if (!estDateValide(ligne.dateOperation)) throw new ErreurEmprunt('date_invalide');
  if (!Number.isSafeInteger(ligne.montant) || ligne.montant >= 0) return undefined;
  const debit = -ligne.montant;
  const debut = ajouterJours(ligne.dateOperation, -fenetreJours);
  const fin = ajouterJours(ligne.dateOperation, fenetreJours);
  return tableau.find((e) => {
    if (!estDateValide(e.date) || totalEcheance(e) !== debit) return false;
    return comparerDates(e.date, debut) >= 0 && comparerDates(e.date, fin) <= 0;
  });
}
