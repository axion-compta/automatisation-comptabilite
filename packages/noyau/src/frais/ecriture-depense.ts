// Écritures proposées E1 (dépense payée par la personne) et E7 (justificatif perdu). Jamais validées ici.
import { ajouter, centimes, soustraire, type Centimes } from '../argent/index.js';
import { verifierEcriture, type Ecriture, type LigneEcriture } from '../ecritures/modele.js';
import { repartirPiece } from './part-perso.js';
import type { ResultatTvaFrais } from './tva-frais.js';
import { ErreurFrais, type ComptesFrais, type Frais } from './types.js';

export interface EnteteDepense {
  id: string;
  journal: string;
  date: string;
}

/** Écriture proposée ; `sansPieceMotif` n'existe que pour E7. */
export type EcritureDepense = Ecriture & { sansPieceMotif?: string };

function invalide(message: string): ErreurFrais {
  return new ErreurFrais('entree_invalide', message);
}

function controler(frais: Frais, tva: ResultatTvaFrais): void {
  if (frais.payeur === 'societe' || frais.statut === 'exclu_paye_societe') {
    throw new ErreurFrais('frais_paye_societe', 'Frais payé par la société : aucune écriture de compte de la personne');
  }
  if (frais.payeur === 'a_confirmer') throw invalide('Payeur à confirmer : aucune écriture');
  if (frais.statut === 'brouillon') throw invalide('Frais en brouillon : aucune écriture');
  if (frais.nature !== 'depense') throw invalide('Seule une dépense donne E1 ou E7');
  const montants = [frais.montantTtc, frais.partPersoTtc, tva.deductible, tva.nonDeductible];
  if (!montants.every((m) => Number.isSafeInteger(m) && m >= 0)) throw invalide('Montants entiers de centimes positifs attendus');
}

function compteCharge(frais: Frais, comptes: ComptesFrais): string {
  const categorie = frais.categorieDepense;
  const compte = categorie !== undefined && Object.hasOwn(comptes.chargeParNature, categorie) ? comptes.chargeParNature[categorie] : undefined;
  if (compte === undefined) throw invalide('Nature de dépense sans compte de charge');
  return compte;
}

export function proposerEcritureDepense(frais: Frais, tva: ResultatTvaFrais, comptes: ComptesFrais, entete: EnteteDepense): EcritureDepense {
  controler(frais, tva);
  const compteDeCharge = compteCharge(frais, comptes);
  // La part perso est écartée : seul le TTC société est dû à la personne.
  const { societe } = repartirPiece({ ttc: frais.montantTtc, tva: centimes(0), partPersoTtc: frais.partPersoTtc });
  const ttc = societe.ttc;
  if (ttc === 0) throw invalide('Montant société nul : aucune écriture');
  const perdu = frais.justificatifPerdu;
  let motif: string | undefined;
  if (perdu) {
    motif = frais.motifSansJustificatif?.trim();
    if (motif === undefined || motif === '') throw new ErreurFrais('motif_obligatoire', 'Justificatif perdu : motif obligatoire');
  }
  const deductible = perdu ? centimes(0) : tva.deductible;
  if (ajouter(deductible, perdu ? centimes(0) : tva.nonDeductible) > ttc) throw invalide('TVA supérieure au TTC société');

  const zero = centimes(0);
  const libelle = motif === undefined ? frais.libelle : frais.libelle + ' - ' + motif;
  const charge: Centimes = soustraire(ttc, deductible);
  const lignes: LigneEcriture[] = [];
  if (charge > 0) lignes.push({ compte: compteDeCharge, libelle, debit: charge, credit: zero });
  if (deductible > 0) lignes.push({ compte: comptes.tvaDeductible, libelle, debit: deductible, credit: zero });
  lignes.push({ compte: comptes.comptePersonne, auxiliaire: frais.personneId, libelle, debit: zero, credit: ttc });

  const e: EcritureDepense = { id: entete.id, journal: entete.journal, date: entete.date, statut: 'propose', lignes };
  if (motif !== undefined) e.sansPieceMotif = motif;
  verifierEcriture(e);
  return e;
}
