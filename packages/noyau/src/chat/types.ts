// Types communs, listes fermées et codes d'erreur du lot 05 (chat et agents).
// Fichier partagé : les autres fiches du lot ne le modifient pas.
import type { Centimes } from '../argent/index.js';

export const NIVEAUX = ['L', 'B', 'M', 'I'] as const;
export type Niveau = (typeof NIVEAUX)[number];
export const CANAUX = ['clavier', 'voix'] as const;
export type Canal = (typeof CANAUX)[number];
export const ISSUES = ['reponse', 'action_proposee', 'navigation', 'question', 'refus_utile', 'escalade'] as const;
export type Issue = (typeof ISSUES)[number];
export const TYPES_EVENEMENT = [
  'tour.debut', 'etape', 'texte', 'carte', 'proposition', 'question', 'erreur', 'tour.fin',
] as const;
export type TypeEvenement = (typeof TYPES_EVENEMENT)[number];
export const TYPES_CARTE = [
  'ecriture', 'piece', 'liste', 'proposition', 'rapprochement', 'tva', 'telechargement',
] as const;
export type TypeCarte = (typeof TYPES_CARTE)[number];
// Liste PROPOSÉE : le texte exact de CHT-054 est absent du dépôt public.
export const CODES_ERREUR = [
  'parametre_invalide', 'outil_hors_liste', 'hors_schema', 'trop_de_demandes', 'budget_tour_atteint',
  'budget_plan_atteint', 'ia_indisponible', 'proposition_inconnue', 'proposition_expiree',
  'acteur_non_humain', 'droit_insuffisant', 'periode_cloturee', 'ecriture_validee', 'annulation_expiree',
  'volume_trop_grand', 'niveau_ferme',
] as const;
export type CodeErreur = (typeof CODES_ERREUR)[number];
export const MOTIFS_REFUS = [
  'ecriture_validee', 'periode_cloturee', 'geste_irreversible_requis', 'suppression_definitive',
  'facture_hors_produit', 'consignes_confidentielles', 'autre_societe',
] as const;
export type MotifRefus = (typeof MOTIFS_REFUS)[number];
export const ETATS_PROPOSITION = ['proposee', 'appliquee', 'annulee', 'expiree', 'refusee'] as const;
export type EtatProposition = (typeof ETATS_PROPOSITION)[number];
export const ACTEURS = ['personne', 'compte_service', 'agent', 'modele', 'systeme'] as const;
export type Acteur = (typeof ACTEURS)[number];
export const ORIGINES = ['personne', 'piece', 'outil'] as const;
export type Origine = (typeof ORIGINES)[number];
export const CONFIANCES = ['sur', 'a_verifier', 'douteux'] as const;
export type Confiance = (typeof CONFIANCES)[number];
export const SOURCES_PROPOSITION = ['regle_societe', 'historique', 'ia_exemples', 'ia_seule'] as const;
export type SourceProposition = (typeof SOURCES_PROPOSITION)[number];
export const ISSUES_APPEL_IA = ['ok', 'secours', 'refus_gardien', 'hors_schema', 'arret'] as const;
export type IssueAppelIa = (typeof ISSUES_APPEL_IA)[number];
export const ETAPES_PIECE = [
  'recue', 'lue_a', 'lue_b', 'comparee', 'classee', 'tva_qualifiee', 'controlee', 'proposition_prete',
] as const;
export type EtapePiece = (typeof ETAPES_PIECE)[number];
export const SORTIES_PIECE = ['a_verifier', 'desaccord', 'en_attente', 'refusee'] as const;
export type SortiePiece = (typeof SORTIES_PIECE)[number];
export const POLES = ['comptabilite', 'fiscalite', 'juridique', 'rgpd_securite'] as const;
export type Pole = (typeof POLES)[number];
export const STATUTS_CONSTAT = ['ouvert', 'explique', 'corrige', 'accepte'] as const;
export type StatutConstat = (typeof STATUTS_CONSTAT)[number];
export const GRAVITES_CONSTAT = ['critique', 'majeur', 'mineur', 'info'] as const;
export type GraviteConstat = (typeof GRAVITES_CONSTAT)[number];

export class ErreurChat extends Error {
  override name = 'ErreurChat';
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

/** Montant en micro-centimes : entier sûr >= 0, marqué comme Centimes. */
export type MicroCentimes = Centimes & { readonly micro: true };

/** -0 est accepté et normalisé en 0. */
export function microCentimes(n: number): MicroCentimes {
  if (!Number.isSafeInteger(n) || n < 0) throw new ErreurChat('montant_invalide');
  return (n === 0 ? 0 : n) as MicroCentimes;
}

export function estDans<T extends string>(liste: readonly T[], valeur: unknown): valeur is T {
  return typeof valeur === 'string' && (liste as readonly string[]).includes(valeur);
}
