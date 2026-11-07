// Types du module frais : aucune logique métier, aucun numéro de compte.
import type { Centimes } from '../argent/index.js';

export type NatureFrais = 'depense' | 'trajet';
export type Payeur = 'societe' | 'personne' | 'a_confirmer';
export type SourcePayeur = 'banque' | 'declaration' | 'ia';
export type StatutFrais =
  | 'brouillon'
  | 'a_completer'
  | 'propose'
  | 'valide'
  | 'rembourse'
  | 'en_compte_courant'
  | 'exclu_paye_societe'
  | 'refuse'
  | 'perso';
export type Destination = 'remboursement' | 'compte_courant';
export type Energie = 'thermique' | 'hybride' | 'hydrogene' | 'electrique';
export type Proprietaire = 'personne' | 'conjoint' | 'societe' | 'location';
export type CategorieVehicule = 'voiture' | 'deux_roues';

export interface Frais {
  id: string;
  personneId: string;
  nature: NatureFrais;
  /** Code libre (ex. repas_affaires, parking) : choisit le compte de charge et la clé de TVA. */
  categorieDepense?: string;
  dateDepense: string;
  libelle: string;
  montantTtc: Centimes;
  tva: Centimes;
  pieceId?: string;
  payeur: Payeur;
  sourcePayeur?: SourcePayeur;
  ligneBanqueId?: string;
  statut: StatutFrais;
  justificatifPerdu: boolean;
  motifSansJustificatif?: string;
  partPersoTtc: Centimes;
  destination?: Destination;
  ecritureId?: string;
  remboursementId?: string;
  version: number;
}

export interface Trajet {
  fraisId: string;
  vehiculeId: string;
  depart: string;
  arrivee: string;
  motif: string;
  kmSaisisDixiemes: number;
  allerRetour: boolean;
}

export interface Vehicule {
  id: string;
  personneId: string;
  puissanceCv: number;
  energie: Energie;
  proprietaire: Proprietaire;
  categorie: CategorieVehicule;
  carteGrisePieceId?: string;
}

/** Les numéros de compte arrivent toujours en argument. */
export interface ComptesFrais {
  chargeParNature: Readonly<Record<string, string>>;
  chargeIk: string;
  tvaDeductible: string;
  comptePersonne: string;
  banque: string;
}

export type CodeErreurFrais =
  | 'frais_paye_societe'
  | 'justificatif_manquant'
  | 'bareme_a_verifier'
  | 'vehicule_societe'
  | 'deux_roues_non_pris_en_charge'
  | 'remboursement_superieur'
  | 'transition_interdite'
  | 'doublon_piece'
  | 'entree_invalide'
  | 'motif_obligatoire'
  | 'compte_courant_reserve_associes';

export class ErreurFrais extends Error {
  override name = 'ErreurFrais';
  readonly code: CodeErreurFrais;
  constructor(code: CodeErreurFrais, message: string) {
    super(message);
    this.code = code;
  }
}

export function estStatutSortie(s: StatutFrais): boolean {
  return s === 'exclu_paye_societe' || s === 'refuse' || s === 'perso';
}

export function estStatutFinal(s: StatutFrais): boolean {
  return estStatutSortie(s) || s === 'rembourse' || s === 'en_compte_courant';
}
