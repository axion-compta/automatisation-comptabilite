// Cotisations du dirigeant non salarié : écritures brouillon d'appel, de paiement et de régularisation.
// L'échéance est la date lue sur l'appel, jamais calculée ; sans date lue : « à vérifier ».
// Aucun calcul de cotisation, aucune date ni aucun taux en dur. Montants en centimes entiers.
import { centimes } from '../argent/index.js';
import type { Ecriture, LigneEcriture } from '../ecritures/modele.js';

export type CodeErreurTns = 'montant_invalide' | 'date_invalide' | 'regularisation_nulle';

export class ErreurTns extends Error {
  override name = 'ErreurTns';
  readonly code: CodeErreurTns;
  constructor(code: CodeErreurTns, message: string) {
    super(message);
    this.code = code;
  }
}

export interface ComptesAppel {
  cotisations: string;
  organismes: string;
}

export interface ComptesPaiement {
  organismes: string;
  banque: string;
}

interface Base {
  id: string;
  date: string;
  journal: string;
}

export interface DemandeAppel extends Base {
  montant: number;
  echeanceLue?: string;
}

export interface DemandePaiement extends Base {
  montant: number;
}

export interface DemandeRegularisation extends Base {
  difference: number;
}

export type Echeance = { date: string } | { aVerifier: true };

function dateValide(s: string): boolean {
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(s);
  if (m === null) return false;
  const [annee, mois, jour] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(annee, mois - 1, jour));
  // Un jour inexistant fait déborder le mois (ou l'année) : la comparaison suffit.
  return d.getUTCFullYear() === annee && d.getUTCMonth() === mois - 1;
}

function verifierDate(s: string): void {
  if (!dateValide(s)) throw new ErreurTns('date_invalide', 'Date invalide.');
}

function verifierMontantPositif(montant: number): void {
  if (!Number.isSafeInteger(montant) || montant <= 0) {
    throw new ErreurTns('montant_invalide', 'Un montant doit être un entier de centimes strictement positif.');
  }
}

function ligne(compte: string, libelle: string, debit: number, credit: number): LigneEcriture {
  return { compte, libelle, debit: centimes(debit), credit: centimes(credit) };
}

function brouillon(b: Base, lignes: LigneEcriture[]): Ecriture {
  return { id: b.id, journal: b.journal, date: b.date, statut: 'brouillon', lignes };
}

/** Appel lu : D cotisations / C organismes. */
export function ecritureAppel(
  demande: DemandeAppel,
  comptes: ComptesAppel,
): { ecriture: Ecriture; echeance: Echeance } {
  verifierMontantPositif(demande.montant);
  verifierDate(demande.date);
  if (demande.echeanceLue !== undefined) verifierDate(demande.echeanceLue);
  const ecriture = brouillon(demande, [
    ligne(comptes.cotisations, 'Appel de cotisations', demande.montant, 0),
    ligne(comptes.organismes, 'Appel de cotisations', 0, demande.montant),
  ]);
  const echeance: Echeance = demande.echeanceLue === undefined ? { aVerifier: true } : { date: demande.echeanceLue };
  return { ecriture, echeance };
}

/** Paiement : D organismes / C banque. */
export function ecriturePaiement(demande: DemandePaiement, comptes: ComptesPaiement): Ecriture {
  verifierMontantPositif(demande.montant);
  verifierDate(demande.date);
  return brouillon(demande, [
    ligne(comptes.organismes, 'Paiement de cotisations', demande.montant, 0),
    ligne(comptes.banque, 'Paiement de cotisations', 0, demande.montant),
  ]);
}

/** Régularisation = écriture de la différence. Positive : D cotisations / C organismes ; négative : l'inverse. */
export function ecritureRegularisation(demande: DemandeRegularisation, comptes: ComptesAppel): Ecriture {
  if (!Number.isSafeInteger(demande.difference)) {
    throw new ErreurTns('montant_invalide', 'Une différence doit être un entier de centimes.');
  }
  if (demande.difference === 0) {
    throw new ErreurTns('regularisation_nulle', 'Une régularisation nulle ne produit aucune écriture.');
  }
  verifierDate(demande.date);
  const montant = Math.abs(demande.difference);
  const [debit, credit] =
    demande.difference > 0 ? [comptes.cotisations, comptes.organismes] : [comptes.organismes, comptes.cotisations];
  return brouillon(demande, [
    ligne(debit, 'Régularisation de cotisations', montant, 0),
    ligne(credit, 'Régularisation de cotisations', 0, montant),
  ]);
}
