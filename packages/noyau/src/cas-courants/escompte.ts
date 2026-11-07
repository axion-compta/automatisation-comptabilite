// Cas courants : escompte obtenu ou consenti, taxe sur véhicule lue. Brouillons seulement.
// Aucun numéro de compte ici : les comptes arrivent en arguments.
import { centimes, soustraire, type Centimes } from '../argent/index.js';
import type { Ecriture } from '../ecritures/modele.js';

export type CodeErreurCasCourant = 'pas_d_escompte' | 'montant_non_lu' | 'entree_invalide';

export class ErreurCasCourant extends Error {
  override name = 'ErreurCasCourant';
  readonly code: CodeErreurCasCourant;
  constructor(code: CodeErreurCasCourant, message: string) {
    super(message);
    this.code = code;
  }
}

export interface ComptesEscompteObtenu { fournisseur: string; escompteObtenu: string }
export interface ComptesEscompteConsenti { escompteConsenti: string; client: string }
export interface ComptesTaxeVehicule { charge: string; etat: string }

interface EntreeBase { id: string; date: string; journal: string }

export interface EntreeEscompte extends EntreeBase { du: number; paye: number; tvaSurEscompte: boolean }

export interface EntreeEscompteConsenti extends EntreeEscompte {
  /** Le client a déduit l'escompte de son règlement : une carte « avoir à demander » est levée. */
  deduitParClient?: boolean;
}

export interface ResultatEscompte { ecriture: Ecriture; blocageTva: boolean }
export interface ResultatEscompteConsenti extends ResultatEscompte { carteAvoirADemander: boolean }
export interface EntreeTaxeVehicule extends EntreeBase { montantLu: number | undefined }

function texteValide(v: unknown): v is string {
  return typeof v === 'string' && v.trim() !== '';
}

function verifierBase(e: EntreeBase): void {
  if (!texteValide(e.id) || !texteValide(e.date) || !texteValide(e.journal)) {
    throw new ErreurCasCourant('entree_invalide', 'Identifiant, date et journal sont obligatoires.');
  }
}

function verifierComptes(comptes: readonly string[]): void {
  if (comptes.some((c) => !texteValide(c))) {
    throw new ErreurCasCourant('entree_invalide', 'Les comptes sont obligatoires.');
  }
}

function montantEntier(v: number): Centimes {
  if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < 0) {
    throw new ErreurCasCourant('entree_invalide', 'Un montant est un entier de centimes positif ou nul.');
  }
  return centimes(v);
}

function calculerEscompte(e: EntreeEscompte): Centimes {
  verifierBase(e);
  const escompte = soustraire(montantEntier(e.du), montantEntier(e.paye));
  if (escompte <= 0) {
    throw new ErreurCasCourant('pas_d_escompte', 'Aucun escompte : le dû moins le payé doit être positif.');
  }
  return escompte;
}

function bloque(e: EntreeEscompte, statutParametreTva: string): boolean {
  return e.tvaSurEscompte === true && statutParametreTva !== 'valide';
}

function brouillon(e: EntreeBase, libelle: string, debit: string, credit: string, montant: Centimes): Ecriture {
  return {
    id: e.id,
    journal: e.journal,
    date: e.date,
    statut: 'brouillon',
    lignes: [
      { compte: debit, libelle, debit: montant, credit: centimes(0) },
      { compte: credit, libelle, debit: centimes(0), credit: montant },
    ],
  };
}

/** Escompte obtenu d'un fournisseur : débit fournisseur, crédit escompte obtenu. */
export function escompteObtenu(
  entree: EntreeEscompte,
  comptes: ComptesEscompteObtenu,
  statutParametreTva: string,
): ResultatEscompte {
  verifierComptes([comptes.fournisseur, comptes.escompteObtenu]);
  const montant = calculerEscompte(entree);
  return {
    ecriture: brouillon(entree, 'Escompte obtenu', comptes.fournisseur, comptes.escompteObtenu, montant),
    blocageTva: bloque(entree, statutParametreTva),
  };
}

/** Escompte consenti à un client : débit escompte consenti, crédit client. */
export function escompteConsenti(
  entree: EntreeEscompteConsenti,
  comptes: ComptesEscompteConsenti,
  statutParametreTva: string,
): ResultatEscompteConsenti {
  verifierComptes([comptes.escompteConsenti, comptes.client]);
  const montant = calculerEscompte(entree);
  return {
    ecriture: brouillon(entree, 'Escompte consenti', comptes.escompteConsenti, comptes.client, montant),
    blocageTva: bloque(entree, statutParametreTva),
    carteAvoirADemander: entree.deduitParClient === true,
  };
}

/** Taxe sur véhicule : montant lu sur l'avis, jamais calculé. */
export function taxeVehiculeLue(entree: EntreeTaxeVehicule, comptes: ComptesTaxeVehicule): Ecriture {
  verifierBase(entree);
  verifierComptes([comptes.charge, comptes.etat]);
  const m = entree.montantLu;
  if (m === undefined || typeof m !== 'number' || !Number.isSafeInteger(m) || m <= 0) {
    throw new ErreurCasCourant('montant_non_lu', 'Le montant de la taxe doit être lu sur l’avis.');
  }
  return brouillon(entree, 'Taxe sur véhicule', comptes.charge, comptes.etat, centimes(m));
}
