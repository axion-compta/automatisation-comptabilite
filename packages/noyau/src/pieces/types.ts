// Types communs du lot 04 (lecture des pièces) : listes fermées, codes d'erreur et noms de champs.
// Aucune logique métier ici. Ce fichier est partagé : aucune autre fiche ne le modifie.
import type { Centimes } from '../argent/index.js';

export const TYPES_PIECE = ['facture', 'facture_acompte', 'recu', 'ticket', 'avoir', 'annulee', 'reemise', 'montant_zero', 'releve_fournisseur', 'non_piece', 'plusieurs_factures', 'facture_dans_corps', 'inconnu'] as const;
export type TypePiece = (typeof TYPES_PIECE)[number];

export const ETATS_TRAITEMENT = ['recue', 'quarantaine', 'preparee', 'lue', 'prete', 'a_verifier', 'refusee', 'en_erreur', 'en_attente_quota'] as const;
export type EtatTraitement = (typeof ETATS_TRAITEMENT)[number];

export const CANAUX = ['glisser', 'chat', 'selecteur', 'photo_mobile', 'email', 'plateforme_agreee', 'api', 'dossier_surveille', 'portail_fournisseur'] as const;
export type Canal = (typeof CANAUX)[number];

export const MOTIFS_NON_COMPTEE = ['annulee', 'montant_zero', 'releve', 'commande', 'contrat', 'reservation', 'rappel', 'devis', 'autre', 'plusieurs_factures', 'doublon', 'depot_errone', 'inconnu', 'a_verifier'] as const;
export type MotifNonComptee = (typeof MOTIFS_NON_COMPTEE)[number];

export const CODES_REFUS = ['type_refuse', 'macro_refusee', 'archive_refusee', 'image_refusee', 'trop_grand', 'infecte', 'destinataire_different'] as const;
export type CodeRefus = (typeof CODES_REFUS)[number];

export const CODES_ERREUR = ['indetermine', 'photo_floue', 'ia_indisponible', 'sortie_invalide', 'plafond_cout', 'quota_ia', 'en_erreur', 'integrite_ko', 'controle_impossible'] as const;
export type CodeErreur = (typeof CODES_ERREUR)[number];

export const MOTIFS_A_VERIFIER = ['sortie_invalide', 'plafond_cout', 'ecart_arithmetique', 'xml_invalide', 'xml_different_du_visuel', 'plusieurs_factures', 'desaccord_type', 'champ_douteux', 'citation_introuvable', 'origine_non_verifiee', 'manuscrit', 'client_facture_douteux', 'taux_inconnu', 'montant_hors_bornes', 'pays_inconnu', 'ttc_nul_ht_non_nul', 'montant_du_non_qualifie', 'fournisseur_inconnu', 'ocr_trop_faible', 'aucun_montant', 'texte_cache', 'collision_numeros'] as const;
export type MotifAVerifier = (typeof MOTIFS_A_VERIFIER)[number];

export const MOTIFS_SENSIBLE = ['piece_identite', 'nir', 'sante_paie'] as const;
export type MotifSensible = (typeof MOTIFS_SENSIBLE)[number];

export const MOTIFS_MASQUAGE = ['nir', 'carte_paiement', 'iban', 'secret'] as const;
export type MotifMasquage = (typeof MOTIFS_MASQUAGE)[number];

export const SORTES_LIEN = ['paiement_de', 'avoir_de', 'reemise_de', 'acompte_de', 'partie_de', 'doublon_de'] as const;
export type SorteLien = (typeof SORTES_LIEN)[number];

export const SOURCES_CHAMP = ['xml', 'texte_pdf', 'ocr', 'vision', 'modele'] as const;
export type SourceChamp = (typeof SOURCES_CHAMP)[number];

export const ACCORDS = ['accord', 'desaccord', 'seul_a', 'seul_b'] as const;
export type Accord = (typeof ACCORDS)[number];

export const MOTS_CONFIANCE = ['sur', 'a_verifier', 'douteux'] as const;
export type MotConfiance = (typeof MOTS_CONFIANCE)[number];

export const MOYENS_PAIEMENT = ['carte_societe', 'autre_carte', 'especes', 'virement', 'prelevement', 'solde_prepaye', 'mixte', 'inconnu'] as const;
export type MoyenPaiement = (typeof MOYENS_PAIEMENT)[number];

export const STATUTS_PERIODE = ['avant_depot', 'formation', 'entre_immatriculation_et_exercice', 'dans_exercice', 'hors_exercice'] as const;
export type StatutPeriode = (typeof STATUTS_PERIODE)[number];

export interface Zone { page: number; x: number; y: number; largeur: number; hauteur: number; }

export interface ChampLu { nom: string; valeur: string; valeurCentimes?: Centimes; source: SourceChamp; lecteur: 'A' | 'B' | 'xml'; citation?: string; zone?: Zone; }

export const CHAMPS_SIMPLES = ['fournisseur_nom', 'fournisseur_siren', 'fournisseur_tva', 'fournisseur_adresse', 'numero', 'date_piece', 'date_service_debut', 'date_service_fin', 'date_echeance', 'devise', 'ttc', 'montant_du', 'client_facture', 'moyen_paiement', 'type_piece', 'langue'] as const;
export type ChampSimple = (typeof CHAMPS_SIMPLES)[number];

export class ErreurPiece extends Error {
  override name = 'ErreurPiece';
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

/** Nom d'un champ par taux : `ht@1900` ou `tva@1900` (taux en points de base). */
export function nomParTaux(prefixe: 'ht' | 'tva', pointsDeBase: number): string {
  if (!Number.isSafeInteger(pointsDeBase) || pointsDeBase < 0) {
    throw new ErreurPiece('nom_de_champ_invalide', 'Les points de base doivent être un entier positif ou nul.');
  }
  return prefixe + '@' + String(pointsDeBase);
}

const CHAMPS_CRITIQUES: readonly string[] = ['ttc', 'numero', 'date_piece', 'fournisseur_nom', 'fournisseur_siren', 'fournisseur_tva'];

/** Un champ critique doit être sûr avant tout enregistrement. */
export function estChampCritique(nom: string): boolean {
  return CHAMPS_CRITIQUES.includes(nom) || nom.startsWith('tva@');
}

/** Garde de type : la valeur appartient-elle à la liste fermée ? */
export function estDans<T extends string>(liste: readonly T[], valeur: unknown): valeur is T {
  return typeof valeur === 'string' && (liste as readonly string[]).includes(valeur);
}
