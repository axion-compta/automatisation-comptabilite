export const FORMES = ['EI', 'EURL', 'SARL', 'SASU', 'SAS', 'SCI'] as const;
export const FORMES_REFUSEES_MVP = ['association'] as const;
export const ORIGINES = ['document', 'sirene', 'declaration', 'fec_reprise', 'saisie_personne', 'proposition_ia'] as const;
export const CONFIANCES = ['sur', 'a_verifier', 'douteux'] as const;
export const STATUTS_CHAMP = ['confirme', 'a_confirmer', 'vide', 'je_ne_sais_pas'] as const;
export const ETATS_PROFIL = ['incomplet', 'a_confirmer', 'complet'] as const;
export const TENUES = ['partie_double', 'livre_recettes'] as const;
export const REGIMES_TVA = ['franchise', 'reel_simplifie', 'reel_normal', 'non_assujetti'] as const;
export const IMPOTS = ['IS', 'IR'] as const;
export const CATEGORIES = ['BIC', 'BNC', 'revenus_fonciers'] as const;
export const REGIMES_IMPOSITION = ['micro', 'reel_simplifie', 'reel_normal', 'declaration_controlee'] as const;
export const MOTIFS_CHANGEMENT = ['creation', 'option', 'depassement_seuil', 'bascule_legale', 'correction'] as const;
export const REPONSES_CAC = ['oui', 'non', 'je_ne_sais_pas'] as const;

export type Forme = (typeof FORMES)[number];
export type FormeRefuseeMvp = (typeof FORMES_REFUSEES_MVP)[number];
export type Origine = (typeof ORIGINES)[number];
export type Confiance = (typeof CONFIANCES)[number];
export type StatutChamp = (typeof STATUTS_CHAMP)[number];
export type EtatProfil = (typeof ETATS_PROFIL)[number];
export type Tenue = (typeof TENUES)[number];
export type RegimeTva = (typeof REGIMES_TVA)[number];
export type Impot = (typeof IMPOTS)[number];
export type Categorie = (typeof CATEGORIES)[number];
export type RegimeImposition = (typeof REGIMES_IMPOSITION)[number];
export type MotifChangement = (typeof MOTIFS_CHANGEMENT)[number];
export type ReponseCac = (typeof REPONSES_CAC)[number];

export type ChampProfil = {
  societeId: string;
  cle: string;
  valeur: unknown;
  origine: Origine;
  confiance: Confiance;
  sourceRef: string | null;
  dateSource: string | null;
  statut: StatutChamp;
  effetDebut: string;
  confirmePar: string | null;
  confirmeLe: string | null;
  rang: number;
};

export class ErreurProfil extends Error {
  readonly code: string;
  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = 'ErreurProfil';
    this.code = code;
  }
}

export function estDans<T extends string>(liste: readonly T[], valeur: unknown): valeur is T {
  return typeof valeur === 'string' && (liste as readonly string[]).includes(valeur);
}

const FORME_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function construire(a: number, m: number, j: number): Date {
  const d = new Date(Date.UTC(2000, 0, 1));
  d.setUTCFullYear(a, m - 1, j);
  return d;
}

function texte(n: number, largeur: number): string {
  return String(n).padStart(largeur, '0');
}

function formater(d: Date): string {
  return texte(d.getUTCFullYear(), 4) + '-' + texte(d.getUTCMonth() + 1, 2) + '-' + texte(d.getUTCDate(), 2);
}

export function estDateIso(t: unknown): t is string {
  if (typeof t !== 'string') return false;
  const m = FORME_DATE.exec(t);
  if (m === null) return false;
  const d = construire(Number(m[1]), Number(m[2]), Number(m[3]));
  return formater(d) === t;
}

export function exigerDate(t: unknown, champ: string): string {
  if (!estDateIso(t)) throw new ErreurProfil('date_invalide', 'date_invalide: ' + champ);
  return t;
}

export function comparerDates(a: string, b: string): -1 | 0 | 1 {
  exigerDate(a, 'a');
  exigerDate(b, 'b');
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function ajouterJours(date: string, n: number): string {
  exigerDate(date, 'date');
  if (typeof n !== 'number' || !Number.isSafeInteger(n)) throw new ErreurProfil('decalage_invalide');
  const [a, m, j] = date.split('-').map(Number) as [number, number, number];
  const d = construire(a, m, j + n);
  const annee = d.getUTCFullYear();
  if (Number.isNaN(annee) || annee < 0 || annee > 9999) throw new ErreurProfil('date_invalide', 'date_invalide: resultat');
  return formater(d);
}

export function joursInclus(debut: string, fin: string, max: number): number {
  exigerDate(debut, 'debut');
  exigerDate(fin, 'fin');
  if (typeof max !== 'number' || !Number.isSafeInteger(max) || max < 0) throw new ErreurProfil('ecart_trop_grand');
  if (fin < debut) throw new ErreurProfil('ordre_inverse');
  let courant = debut;
  let compte = 1;
  while (courant !== fin) {
    if (compte >= max) throw new ErreurProfil('ecart_trop_grand');
    courant = ajouterJours(courant, 1);
    compte += 1;
  }
  if (compte > max) throw new ErreurProfil('ecart_trop_grand');
  return compte;
}
