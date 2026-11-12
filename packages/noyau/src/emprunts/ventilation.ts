// Ventilation d'une échéance d'emprunt en brouillon : D 164 capital, D 6611 intérêts, D 616 assurance, C 512.
// Sans tableau, aucun montant n'est deviné : une carte « Ventiler » à compléter.
import { centimes, type Centimes } from '../argent/index.js';
import type { Ecriture, LigneEcriture } from '../ecritures/modele.js';
import { ErreurEmprunt, totalEcheance, type Echeance } from './echeance.js';

export type LigneAVentiler = { readonly id: string; readonly dateOperation: string; readonly montant: Centimes; readonly libelle: string };
export type ResultatVentilation =
  | { readonly etat: 'brouillon'; readonly ecriture: Ecriture }
  | { readonly etat: 'carte'; readonly carte: 'ventiler'; readonly ligneId: string; readonly montant: Centimes };

const JOURNAL_BANQUE = 'BQ';

export function ventiler(ligne: LigneAVentiler, echeance: Echeance | undefined): ResultatVentilation {
  if (!Number.isSafeInteger(ligne.montant) || ligne.montant >= 0) throw new ErreurEmprunt('pas_un_debit');
  const debit = centimes(-ligne.montant);
  if (echeance === undefined) return { etat: 'carte', carte: 'ventiler', ligneId: ligne.id, montant: debit };
  const total = totalEcheance(echeance);
  if (total === undefined) throw new ErreurEmprunt('tableau_incoherent');
  if (total !== debit) throw new ErreurEmprunt('somme_differente');
  const part = (compte: string, montant: Centimes): LigneEcriture[] =>
    montant > 0 ? [{ compte, libelle: ligne.libelle, debit: montant, credit: centimes(0) }] : [];
  const lignes: LigneEcriture[] = [
    ...part('164', echeance.capital),
    ...part('6611', echeance.interets),
    ...part('616', echeance.assurance),
    { compte: '512', libelle: ligne.libelle, debit: centimes(0), credit: debit },
  ];
  return { etat: 'brouillon', ecriture: { id: 'emprunt-' + ligne.id, journal: JOURNAL_BANQUE, date: ligne.dateOperation, statut: 'brouillon', lignes } };
}
