// Facture d'achat : la TVA perdue s'ajoute à la charge, la TVA déductible va à son compte.
// Aucun calcul de part ici : l'effet vient de `effetTraitement`. Montants en centimes entiers.
import { ajouter, centimes, soustraire, type Centimes } from '../argent/index.js';
import type { LigneEcriture } from '../ecritures/modele.js';
import type { EffetTraitement } from './traitement.js';

export type CodeErreurPartNonDeductible = 'montant_invalide' | 'compte_manquant' | 'effet_incoherent';

export class ErreurPartNonDeductible extends Error {
  override name = 'ErreurPartNonDeductible';
  readonly code: CodeErreurPartNonDeductible;
  constructor(code: CodeErreurPartNonDeductible, message: string) {
    super(message);
    this.code = code;
  }
}

export interface FacturePartPerdue {
  libelle: string;
  htCentimes: Centimes;
  ttcCentimes: Centimes;
  /** Compte de charge (ou d'immobilisation) du hors taxe. */
  compteCharge: string;
}

export interface ComptesPartPerdue {
  tvaDeductible: string;
  fournisseur: string;
}

function entierPositif(v: number): boolean {
  return Number.isSafeInteger(v) && v >= 0;
}

function exigerCompte(compte: string): void {
  if (compte.trim() === '') throw new ErreurPartNonDeductible('compte_manquant', 'Un compte est requis.');
}

/** Lignes équilibrées : charge = HT + TVA perdue, TVA déductible, TTC au fournisseur. */
export function lignesAvecPartPerdue(facture: FacturePartPerdue, effet: EffetTraitement, comptes: ComptesPartPerdue): LigneEcriture[] {
  exigerCompte(facture.compteCharge);
  exigerCompte(comptes.tvaDeductible);
  exigerCompte(comptes.fournisseur);
  const { htCentimes: ht, ttcCentimes: ttc } = facture;
  if (!entierPositif(ht) || !entierPositif(ttc) || !entierPositif(effet.deductible) || !entierPositif(effet.perdue) || ttc < ht) {
    throw new ErreurPartNonDeductible('montant_invalide', 'Les montants doivent être des entiers positifs ou nuls, TTC au moins égal au HT.');
  }
  if (effet.aVerifier || effet.collectee !== 0 || effet.sousReserve !== 0) {
    throw new ErreurPartNonDeductible('effet_incoherent', 'Un effet à vérifier, collecté ou sous réserve ne se met pas en écriture ici.');
  }
  const tva = soustraire(ttc, ht);
  if (ajouter(effet.deductible, effet.perdue) !== tva) {
    throw new ErreurPartNonDeductible('effet_incoherent', 'La TVA déductible et la TVA perdue ne rendent pas la TVA de la facture.');
  }
  const lignes: LigneEcriture[] = [
    { compte: facture.compteCharge, libelle: facture.libelle, debit: ajouter(ht, effet.perdue), credit: centimes(0) },
  ];
  if (effet.deductible > 0) {
    lignes.push({ compte: comptes.tvaDeductible, libelle: facture.libelle, debit: effet.deductible, credit: centimes(0) });
  }
  lignes.push({ compte: comptes.fournisseur, libelle: facture.libelle, debit: centimes(0), credit: ttc });
  return lignes;
}
