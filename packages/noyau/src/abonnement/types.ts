// Types, codes d'erreur, événements et dates communs du lot 07 (abonnement).
// Fichier partagé : les autres fiches du lot ne le modifient pas.

export const ETATS_ACCES = ['ESSAI', 'ACTIF', 'DELAI_DE_GRACE', 'LECTURE_SEULE', 'SUSPENDU', 'RESILIE'] as const;
export type EtatAcces = (typeof ETATS_ACCES)[number];

// `compte` : gestion du compte, jamais refusée par l'état.
export const CLASSES_ACTION = ['lecture', 'export', 'ecriture', 'agent', 'compte'] as const;
export type ClasseAction = (typeof CLASSES_ACTION)[number];

export type EtatVoulu = {
  etat: 'actif' | 'pause' | 'arrete'; version: number; arretEnvois: boolean;
  droitsUsage?: readonly string[]; periodeEssaiFin?: string; impayeSignale?: boolean; dateFin?: string;
};

export type CodeErreurAbonnement =
  | 'date_invalide' | 'horodatage_invalide' | 'entier_invalide' | 'etat_voulu_invalide' | 'auteur_manquant'
  | 'palier_invalide' | 'champ_inconnu' | 'nom_de_palier_interdit' | 'accord_manquant' | 'palier_identique'
  | 'palier_inconnu' | 'palier_non_superieur' | 'motif_manquant' | 'gel_deja_actif' | 'gel_inactif'
  | 'pas_de_remise' | 'deja_accuse' | 'empreinte_invalide' | 'empreinte_differente' | 'document_absent'
  | 'version_perimee' | 'depassement_entier' | 'parametre_invalide';

export class ErreurAbonnement extends Error {
  readonly code: CodeErreurAbonnement;
  constructor(code: CodeErreurAbonnement) {
    super(code);
    this.name = 'ErreurAbonnement';
    this.code = code;
  }
}

export type TypeEvenement =
  | 'acces.etat_change' | 'acces.version_ignoree' | 'acces.reglage_local_ignore' | 'abonnement.seuil_atteint'
  | 'abonnement.palier_demande' | 'fin_contrat.preavis' | 'fin_contrat.export_remis' | 'fin_contrat.accuse'
  | 'fin_contrat.effacement_planifie' | 'fin_contrat.relance' | 'fin_contrat.transmis_a_axion'
  | 'fin_contrat.gel_pose' | 'fin_contrat.gel_leve' | 'acceptation.enregistree';

export type EvenementJournal = {
  type: TypeEvenement; horodatage: string; donnees: Readonly<Record<string, string | number | boolean | null>>;
};

export type Gel = { actif: boolean; motif: string | null; posePar: string | null; poseLe: string | null };

export type FinContrat = {
  dateFin: string | null; remisLe: string | null; manifesteEmpreinte: string | null;
  accuseLe: string | null; accusePar: string | null; gelModule: Gel; gelConsole: boolean;
};

const FORME_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const FORME_HORODATAGE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?Z$/;
const FORME_EMPREINTE = /^[0-9a-f]{64}$/;

// Millisecondes depuis l'époque pour un jour du calendrier (année complète, même avant 100).
function epoque(a: number, m: number, j: number): number {
  const d = new Date(Date.UTC(2000, 0, 1));
  d.setUTCFullYear(a, m - 1, j);
  return d.getTime();
}

function jourReel(a: number, m: number, j: number): boolean {
  const t = new Date(epoque(a, m, j));
  return t.getUTCFullYear() === a && t.getUTCMonth() === m - 1 && t.getUTCDate() === j;
}

export function verifierDate(d: string): void {
  const r = typeof d === 'string' ? FORME_DATE.exec(d) : null;
  if (r === null || !jourReel(Number(r[1]), Number(r[2]), Number(r[3]))) {
    throw new ErreurAbonnement('date_invalide');
  }
}

export function verifierHorodatage(h: string): void {
  const r = typeof h === 'string' ? FORME_HORODATAGE.exec(h) : null;
  if (
    r === null ||
    !jourReel(Number(r[1]), Number(r[2]), Number(r[3])) ||
    Number(r[4]) > 23 ||
    Number(r[5]) > 59 ||
    Number(r[6]) > 59
  ) {
    throw new ErreurAbonnement('horodatage_invalide');
  }
}

export function verifierEntier(n: number, min: number): void {
  if (typeof n !== 'number' || !Number.isSafeInteger(n) || n < min) {
    throw new ErreurAbonnement('entier_invalide');
  }
}

export function verifierEmpreinte(e: string): void {
  if (typeof e !== 'string' || !FORME_EMPREINTE.test(e)) {
    throw new ErreurAbonnement('empreinte_invalide');
  }
}

function deuxChiffres(n: number): string {
  return n < 10 ? '0' + String(n) : String(n);
}

function quatreChiffres(n: number): string {
  return String(n).padStart(4, '0');
}

export function ajouterJours(date: string, n: number): string {
  verifierDate(date);
  if (typeof n !== 'number' || !Number.isSafeInteger(n)) throw new ErreurAbonnement('entier_invalide');
  const [a, m, j] = date.split('-').map(Number) as [number, number, number];
  const t = new Date(Date.UTC(a, m - 1, j + n));
  if (a < 100) t.setTime(epoque(a, m, j + n));
  const annee = t.getUTCFullYear();
  if (Number.isNaN(annee) || annee < 0 || annee > 9999) throw new ErreurAbonnement('date_invalide');
  return quatreChiffres(annee) + '-' + deuxChiffres(t.getUTCMonth() + 1) + '-' + deuxChiffres(t.getUTCDate());
}

const MS_PAR_JOUR = 24 * 60 * 60 * 1000;

// b - a en jours entiers, sans division : recherche dichotomique bornée sur d * MS_PAR_JOUR.
export function ecartJours(a: string, b: string): number {
  verifierDate(a);
  verifierDate(b);
  const pa = a.split('-').map(Number) as [number, number, number];
  const pb = b.split('-').map(Number) as [number, number, number];
  const diff = epoque(pb[0], pb[1], pb[2]) - epoque(pa[0], pa[1], pa[2]);
  let bas = -4_000_000;
  let haut = 4_000_000;
  while (bas < haut) {
    const milieu = (bas + haut + 1) >> 1;
    if (milieu * MS_PAR_JOUR <= diff) bas = milieu;
    else haut = milieu - 1;
  }
  return bas;
}
