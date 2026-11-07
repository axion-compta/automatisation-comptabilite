// Ventes : types communs, codes d'erreur, anomalies et dates locales du lot 10.
// Le logiciel lit les factures de vente du client ; il n'en émet aucune.
import type { Centimes } from '../argent/index.js';

export const TYPES_PIECE_VENTE = ['facture', 'avoir', 'facture_acompte'] as const;
export type TypePieceVente = (typeof TYPES_PIECE_VENTE)[number];

export const ORIGINES_VENTE = ['depot', 'email', 'import_fichier', 'plateforme_agreee'] as const;
export type OrigineVente = (typeof ORIGINES_VENTE)[number];

export const STATUTS_VENTE = ['lue', 'a_verifier', 'proposee', 'validee', 'doublon', 'rejetee'] as const;
export type StatutVente = (typeof STATUTS_VENTE)[number];

export const NATURES_LIGNE = ['bien', 'service', 'a_confirmer'] as const;
export type NatureLigne = (typeof NATURES_LIGNE)[number];

export const CODES_TVA_VENTE = [
  'COLLECTEE',
  'FRANCHISE',
  'EXONEREE_A_VERIFIER',
  'AUTOLIQUIDATION_CLIENT',
  'A_VERIFIER',
] as const;
export type CodeTvaVente = (typeof CODES_TVA_VENTE)[number];

export const NATURES_CLIENT = ['professionnel', 'particulier', 'a_confirmer'] as const;
export type NatureClient = (typeof NATURES_CLIENT)[number];

export const STATUTS_VIES = ['verifie', 'non_verifie', 'invalide'] as const;
export type StatutVies = (typeof STATUTS_VIES)[number];

export const CAS_SCHEMA = ['A', 'B', 'C', 'D'] as const;
export type CasSchema = (typeof CAS_SCHEMA)[number];

export const ETATS_AFFICHES = [
  'a_relire',
  'proposee',
  'a_encaisser',
  'payee_en_partie',
  'en_retard',
  'payee',
  'en_litige',
  'doublon',
] as const;
export type EtatAffiche = (typeof ETATS_AFFICHES)[number];

export const ANOMALIES = [
  'A1',
  'A2',
  'A3',
  'A4',
  'A5',
  'A6',
  'A7',
  'A8',
  'A9',
  'A10',
  'A11',
  'A12',
  'A13',
  'A14',
  'A15',
  'A16',
  'A17',
  'A18',
  'A19',
  'A20',
] as const;
export type Anomalie = (typeof ANOMALIES)[number];

export interface PieceVente {
  id: string;
  type: TypePieceVente;
  origine: OrigineVente;
  clientId?: string;
  serie?: string;
  numero: string;
  numeroOrdre?: number;
  dateFacture: string;
  dateOperation?: string;
  echeance?: string;
  htCentimes: Centimes;
  tvaCentimes: Centimes;
  ttcCentimes: Centimes;
  factureOrigineId?: string;
  statut: StatutVente;
  cle?: string;
}

export interface LigneVente {
  libelle: string;
  htCentimes: Centimes;
  tauxPdb: number | null;
  tvaLueCentimes: Centimes;
  nature: NatureLigne;
  compteProduit?: string;
  codeTva: CodeTvaVente;
}

// Valeurs déjà lues à la date par l'appelant.
export interface ProfilVente {
  tenue: 'partie_double' | 'livre_recettes';
  regimeTva: 'reel' | 'franchise' | 'a_confirmer';
  optionDebitsDepuis: string | null;
}

// Numéros de comptes fournis par l'appelant, jamais écrits dans le noyau.
export interface ComptesVente {
  client: string;
  tvaCollectee: string;
  tvaEnAttente: string;
  avancesClients: string;
  banque: string;
}

export interface LigneTvaVente {
  compte: string;
  tauxPdb: number | null;
  baseCentimes: Centimes;
  tvaCentimes: Centimes;
  codeTva: CodeTvaVente;
  cas: CasSchema;
  sens: 'vente' | 'avoir' | 'acompte';
  dateExigibilite: string | null;
  pieceId: string;
}

export class ErreurVente extends Error {
  override name = 'ErreurVente';
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export function estDans<T extends string>(liste: readonly T[], valeur: unknown): valeur is T {
  return typeof valeur === 'string' && (liste as readonly string[]).includes(valeur);
}

const FORME_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function lireDate(t: string): Date | null {
  const m = FORME_DATE.exec(t);
  if (m === null) return null;
  const annee = Number(m[1]);
  const mois = Number(m[2]);
  const jour = Number(m[3]);
  const d = new Date(0);
  d.setUTCFullYear(annee, mois - 1, jour);
  if (d.getUTCFullYear() !== annee || d.getUTCMonth() !== mois - 1 || d.getUTCDate() !== jour) return null;
  return d;
}

export function estDateIso(t: unknown): t is string {
  return typeof t === 'string' && lireDate(t) !== null;
}

function exigerLue(t: unknown, champ: string): Date {
  const d = typeof t === 'string' ? lireDate(t) : null;
  if (d === null) throw new ErreurVente('date_invalide', `Date invalide pour ${champ}.`);
  return d;
}

export function exigerDate(t: unknown, champ: string): string {
  exigerLue(t, champ);
  return t as string;
}

export function ajouterJours(date: string, n: number): string {
  const d = exigerLue(date, 'date');
  if (!Number.isSafeInteger(n)) throw new ErreurVente('decalage_invalide', 'Décalage en jours invalide.');
  d.setUTCDate(d.getUTCDate() + n);
  const annee = d.getUTCFullYear();
  if (Number.isNaN(annee) || annee < 0 || annee > 9999) {
    throw new ErreurVente('decalage_invalide', 'Décalage en jours hors limites.');
  }
  const deux = (x: number): string => String(x).padStart(2, '0');
  return `${String(annee).padStart(4, '0')}-${deux(d.getUTCMonth() + 1)}-${deux(d.getUTCDate())}`;
}

export function comparerDates(a: string, b: string): -1 | 0 | 1 {
  const ecart = exigerLue(a, 'a').getTime() - exigerLue(b, 'b').getTime();
  return ecart < 0 ? -1 : ecart > 0 ? 1 : 0;
}
