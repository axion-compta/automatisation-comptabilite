// Livre des recettes du micro-entrepreneur : une ligne par encaissement, aucune écriture.
// Le seuil arrive en argument (paramètre daté) ; un dépassement est PROPOSÉ, jamais appliqué.
import type { Centimes } from '../argent/index.js';
import { estDateValide } from '../dates/civiles.js';
import { ErreurVente, estDans } from './types.js';

export const MODES_REGLEMENT = ['virement', 'cheque', 'especes', 'carte', 'prelevement', 'autre'] as const;
export type ModeReglement = (typeof MODES_REGLEMENT)[number];
const STATUTS_SEUIL = ['non_verifie', 'a_verifier', 'valide'] as const;
const LONGUEUR_ANNEE = 4;

export interface LigneLivreRecettes {
  dateEncaissement: string;
  client: string;
  montant: Centimes;
  mode: ModeReglement;
  numeroFacture: string;
}
export interface SeuilDate {
  valeur: Centimes;
  statut: (typeof STATUTS_SEUIL)[number];
}
export interface ResultatSeuil {
  depasse: boolean;
  propositionChangementRegime: boolean;
  aVerifier: boolean;
  parametreAbsent: boolean;
}

function exigerEntierPositif(n: number, champ: string, zeroPermis: boolean): number {
  if (!Number.isSafeInteger(n) || n < (zeroPermis ? 0 : 1)) {
    throw new ErreurVente('montant_invalide', `Montant invalide : ${champ}.`);
  }
  return n;
}

function exigerTexte(t: unknown, champ: string): string {
  const v = typeof t === 'string' ? t.trim() : '';
  if (v === '') throw new ErreurVente('texte_vide', `Champ obligatoire : ${champ}.`);
  return v;
}

function exigerAnnee(annee: number): number {
  if (!Number.isSafeInteger(annee)) throw new ErreurVente('annee_invalide', 'Année invalide.');
  return annee;
}

export function ligneLivreRecettes(entree: LigneLivreRecettes): LigneLivreRecettes {
  const date = entree.dateEncaissement;
  if (!estDateValide(date)) {
    throw new ErreurVente('date_invalide', "Date d'encaissement invalide.");
  }
  exigerEntierPositif(entree.montant, 'montant', false);
  if (!estDans(MODES_REGLEMENT, entree.mode)) throw new ErreurVente('mode_inconnu', 'Mode de règlement inconnu.');
  return {
    dateEncaissement: date,
    client: exigerTexte(entree.client, 'client'),
    montant: entree.montant,
    mode: entree.mode,
    numeroFacture: exigerTexte(entree.numeroFacture, 'numéro de facture'),
  };
}

const anneeDe = (l: LigneLivreRecettes): number => Number(l.dateEncaissement.slice(0, LONGUEUR_ANNEE));

/** Lignes de l'année civile, triées par date puis par numéro de facture (l'entrée n'est pas modifiée). */
export function livreDesRecettes(lignes: readonly LigneLivreRecettes[], annee: number): LigneLivreRecettes[] {
  const a = exigerAnnee(annee);
  return lignes
    .filter((l) => anneeDe(l) === a)
    .sort((x, y) => x.dateEncaissement.localeCompare(y.dateEncaissement, 'fr') || x.numeroFacture.localeCompare(y.numeroFacture, 'fr'));
}

export function caEncaisseAnnee(lignes: readonly LigneLivreRecettes[], annee: number): Centimes {
  return livreDesRecettes(lignes, annee).reduce((somme, l) => somme + l.montant, 0) as Centimes;
}

export function depassementSeuil(entree: {
  caAvant: Centimes;
  montant: Centimes;
  seuil: SeuilDate | undefined;
}): ResultatSeuil {
  exigerEntierPositif(entree.caAvant, 'chiffre avant', true);
  exigerEntierPositif(entree.montant, 'montant', false);
  const { seuil } = entree;
  if (seuil === undefined) {
    return { depasse: false, propositionChangementRegime: false, aVerifier: false, parametreAbsent: true };
  }
  exigerEntierPositif(seuil.valeur, 'seuil', false);
  if (!estDans(STATUTS_SEUIL, seuil.statut)) throw new ErreurVente('statut_invalide', 'Statut du seuil inconnu.');
  const depasse = entree.caAvant + entree.montant > seuil.valeur;
  return {
    depasse,
    propositionChangementRegime: depasse,
    aVerifier: seuil.statut !== 'valide',
    parametreAbsent: false,
  };
}
