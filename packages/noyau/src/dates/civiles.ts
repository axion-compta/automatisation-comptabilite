// Dates civiles `AAAA-MM-JJ`, sans fuseau horaire : validation et arithmétique sur entiers.
// Règle de fin de mois : si le jour n'existe pas dans le mois d'arrivée, on prend le DERNIER jour de ce mois
// (31/08 + 6 mois = 28/02 ou 29/02 ; 29/02 + 1 an = 28/02). L'année doit rester entre 1000 et 9999.
// Aucune division ni objet `Date` : tables de jours par mois et boucles bornées par le nombre d'années.

export type CodeErreurDate = 'date_invalide' | 'decalage_invalide';

export class ErreurDate extends Error {
  override name = 'ErreurDate';
  readonly code: CodeErreurDate;
  constructor(code: CodeErreurDate) {
    super(code);
    this.code = code;
  }
}

const ANNEE_MIN = 1000;
const ANNEE_MAX = 9999;
const JOURS_PAR_MOIS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

interface Civile {
  annee: number;
  mois: number;
  jour: number;
}

function estBissextile(annee: number): boolean {
  return annee % 4 === 0 && (annee % 100 !== 0 || annee % 400 === 0);
}

function joursDansMois(annee: number, mois: number): number {
  return mois === 2 && estBissextile(annee) ? 29 : (JOURS_PAR_MOIS[mois - 1] ?? 0);
}

function joursDansAnnee(annee: number): number {
  return estBissextile(annee) ? 366 : 365;
}

function lire(texte: string): Civile | undefined {
  const trouve = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(texte);
  if (trouve === null) return undefined;
  const annee = Number(trouve[1]);
  const mois = Number(trouve[2]);
  const jour = Number(trouve[3]);
  if (annee < ANNEE_MIN || annee > ANNEE_MAX || mois < 1 || mois > 12) return undefined;
  if (jour < 1 || jour > joursDansMois(annee, mois)) return undefined;
  return { annee, mois, jour };
}

function exiger(texte: string): Civile {
  const d = lire(texte);
  if (d === undefined) throw new ErreurDate('date_invalide');
  return d;
}

function ecrire(annee: number, mois: number, jour: number): string {
  if (!Number.isSafeInteger(annee) || annee < ANNEE_MIN || annee > ANNEE_MAX) {
    throw new ErreurDate('date_invalide');
  }
  const deux = (n: number): string => String(n).padStart(2, '0');
  return `${String(annee)}-${deux(mois)}-${deux(jour)}`;
}

function exigerDecalage(n: number): void {
  if (typeof n !== 'number' || !Number.isSafeInteger(n)) throw new ErreurDate('decalage_invalide');
}

/** Nombre de jours écoulés depuis le 1000-01-01 (boucle par année, jamais par jour). */
function numeroDeJour(d: Civile): number {
  let total = 0;
  for (let a = ANNEE_MIN; a < d.annee; a += 1) total += joursDansAnnee(a);
  for (let m = 1; m < d.mois; m += 1) total += joursDansMois(d.annee, m);
  return total + d.jour - 1;
}

function depuisNumeroDeJour(numero: number): string {
  if (numero < 0) throw new ErreurDate('date_invalide');
  let reste = numero;
  let annee = ANNEE_MIN;
  while (reste >= joursDansAnnee(annee)) {
    reste -= joursDansAnnee(annee);
    annee += 1;
    if (annee > ANNEE_MAX) throw new ErreurDate('date_invalide');
  }
  let mois = 1;
  while (reste >= joursDansMois(annee, mois)) {
    reste -= joursDansMois(annee, mois);
    mois += 1;
  }
  return ecrire(annee, mois, reste + 1);
}

export function estDateValide(texte: string): boolean {
  return typeof texte === 'string' && lire(texte) !== undefined;
}

export function ajouterJours(date: string, n: number): string {
  const d = exiger(date);
  exigerDecalage(n);
  return depuisNumeroDeJour(numeroDeJour(d) + n);
}

export function ajouterMois(date: string, n: number): string {
  const d = exiger(date);
  exigerDecalage(n);
  const total = d.annee * 12 + (d.mois - 1) + n;
  if (total < ANNEE_MIN * 12 || total > ANNEE_MAX * 12 + 11) throw new ErreurDate('date_invalide');
  let reste = total - ANNEE_MIN * 12;
  let annee = ANNEE_MIN;
  while (reste >= 12) {
    reste -= 12;
    annee += 1;
  }
  const mois = reste + 1;
  return ecrire(annee, mois, Math.min(d.jour, joursDansMois(annee, mois)));
}

export function ajouterAnnees(date: string, n: number): string {
  const d = exiger(date);
  exigerDecalage(n);
  const annee = d.annee + n;
  if (!Number.isSafeInteger(annee) || annee < ANNEE_MIN || annee > ANNEE_MAX) {
    throw new ErreurDate('date_invalide');
  }
  return ecrire(annee, d.mois, Math.min(d.jour, joursDansMois(annee, d.mois)));
}

export function finDeMois(date: string): string {
  const d = exiger(date);
  return ecrire(d.annee, d.mois, joursDansMois(d.annee, d.mois));
}

export function comparerDates(a: string, b: string): -1 | 0 | 1 {
  exiger(a);
  exiger(b);
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

/** 1 = lundi … 7 = dimanche. Repère : le 2027-05-15 est un samedi (6). */
export function jourDeSemaine(date: string): number {
  const ecart = numeroDeJour(exiger(date)) - numeroDeJour({ annee: 2027, mois: 5, jour: 15 });
  const reste = (((ecart + 5) % 7) + 7) % 7; // samedi = 5 en base 0 (lundi = 0)
  return reste + 1;
}

/** `AAAA-MM` */
export function moisCle(date: string): string {
  exiger(date);
  return date.slice(0, 7);
}
