// Acompte versé à un fournisseur : écritures proposées (jamais validées) et imputation à la facture finale.
// Traitement envisagé, à vérifier. Aucun texte affiché : seulement des codes.
import { soustraire, type Centimes } from '../../argent/index.js';
import { verifierEcriture, type Ecriture, type LigneEcriture } from '../../ecritures/modele.js';
import { ErreurControle, exigerCentimes, parametreUtilisable } from '../regles/commun.js';
import type { ParametreLu } from '../regles/commun.js';

export interface EntreeAcompteVerse {
  ttc: Centimes;
  tva: Centimes;
  factureAcompte: boolean;
  parametre: ParametreLu;
  comptes: { avance: string; tvaDeductible: string; banque: string };
  date: string;
  journal: string;
}

export interface EntreeImputation {
  acompte: { ttc: Centimes; tva: Centimes; avecTva: boolean };
  comptes: { fournisseur: string; avance: string; tvaDeductible: string };
  date: string;
  journal: string;
}

export type ResultatAcompteVerse = { etat: 'propose'; ecriture: Ecriture } | { etat: 'refuse'; code: 'parametre_non_valide' };

const ZERO = 0 as Centimes;
const debit = (compte: string, montant: Centimes): LigneEcriture => ({ compte, libelle: 'acompte', debit: montant, credit: ZERO });
const credit = (compte: string, montant: Centimes): LigneEcriture => ({ compte, libelle: 'acompte', debit: ZERO, credit: montant });

function verifierMontants(ttc: Centimes, tva: Centimes): void {
  if (exigerCentimes(ttc) <= 0 || exigerCentimes(tva) < 0 || tva > ttc) throw new ErreurControle('entree_invalide');
}

function proposer(id: string, e: { date: string; journal: string }, lignes: LigneEcriture[]): Ecriture {
  const ecriture: Ecriture = { id: id + '-' + e.journal + '-' + e.date, journal: e.journal, date: e.date, statut: 'propose', lignes };
  verifierEcriture(ecriture);
  return ecriture;
}

export function ecrituresAcompteVerse(e: EntreeAcompteVerse): ResultatAcompteVerse {
  verifierMontants(e.ttc, e.tva);
  const c = e.comptes;
  if (!e.factureAcompte) {
    return { etat: 'propose', ecriture: proposer('acompte-verse', e, [debit(c.avance, e.ttc), credit(c.banque, e.ttc)]) };
  }
  if (!parametreUtilisable(e.parametre)) return { etat: 'refuse', code: 'parametre_non_valide' };
  const ht = soustraire(e.ttc, e.tva);
  const lignes = [debit(c.avance, ht), debit(c.tvaDeductible, e.tva), credit(c.banque, e.ttc)];
  return { etat: 'propose', ecriture: proposer('acompte-verse', e, lignes) };
}

/** Solde le compte d'avance à la facture finale ; la TVA déduite à l'acompte est reprise si elle existe. */
export function imputationAcompte(e: EntreeImputation): Ecriture {
  const { ttc, tva, avecTva } = e.acompte;
  verifierMontants(ttc, tva);
  const c = e.comptes;
  const lignes = avecTva
    ? [debit(c.fournisseur, ttc), credit(c.avance, soustraire(ttc, tva)), credit(c.tvaDeductible, tva)]
    : [debit(c.fournisseur, ttc), credit(c.avance, ttc)];
  return proposer('imputation-acompte', e, lignes);
}
