// Dates civiles AAAA-MM-JJ du lot 15 : sans Date, sans division, par découpe de chaîne.

export type CodeErreurDate = 'date_invalide' | 'nombre_invalide';

export class ErreurDate extends Error {
  readonly code: CodeErreurDate;
  constructor(code: CodeErreurDate) {
    super(code);
    this.name = 'ErreurDate';
    this.code = code;
  }
}

const ANNEE_MIN = 1000;
const ANNEE_MAX = 9999;
const FORME = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const JOURS_MOIS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function bissextile(a: number): boolean {
  return (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0;
}

function joursDuMois(a: number, m: number): number {
  return m === 2 && bissextile(a) ? 29 : JOURS_MOIS[m - 1]!;
}

function joursDeLAnnee(a: number): number {
  return bissextile(a) ? 366 : 365;
}

function decouper(s: string): { a: number; m: number; j: number } | null {
  if (typeof s !== 'string' || !FORME.test(s)) return null;
  const a = Number(s.slice(0, 4));
  const m = Number(s.slice(5, 7));
  const j = Number(s.slice(8, 10));
  if (a < ANNEE_MIN || a > ANNEE_MAX || m < 1 || m > 12) return null;
  if (j < 1 || j > joursDuMois(a, m)) return null;
  return { a, m, j };
}

export function dateValide(s: string): boolean {
  return decouper(s) !== null;
}

function lire(s: string): { a: number; m: number; j: number } {
  const d = decouper(s);
  if (d === null) throw new ErreurDate('date_invalide');
  return d;
}

// DEBUTS[i] = numéro du premier jour de l'année ANNEE_MIN + i (une entrée de plus que d'années).
const DEBUTS: number[] = [0];
for (let y = ANNEE_MIN; y <= ANNEE_MAX; y += 1) DEBUTS.push(DEBUTS[DEBUTS.length - 1]! + joursDeLAnnee(y));

/** Numéro de jour depuis le premier jour de l'année minimale (0 pour ce jour). */
function ordinal(s: string): number {
  const { a, m, j } = lire(s);
  let total = DEBUTS[a - ANNEE_MIN]!;
  for (let k = 1; k < m; k += 1) total += joursDuMois(a, k);
  return total + (j - 1);
}

function deuxChiffres(n: number): string {
  return n < 10 ? '0' + String(n) : String(n);
}

function depuisOrdinal(ord: number): string {
  if (ord < 0) throw new ErreurDate('date_invalide');
  if (ord >= DEBUTS[DEBUTS.length - 1]!) throw new ErreurDate('date_invalide');
  // Recherche dichotomique de l'année : dernier indice dont le début est <= ord.
  let bas = 0;
  let haut = DEBUTS.length - 2;
  while (bas < haut) {
    const milieu = (bas + haut + 1) >> 1;
    if (DEBUTS[milieu]! <= ord) bas = milieu;
    else haut = milieu - 1;
  }
  const a = ANNEE_MIN + bas;
  let reste = ord - DEBUTS[bas]!;
  let m = 1;
  while (reste >= joursDuMois(a, m)) {
    reste -= joursDuMois(a, m);
    m += 1;
  }
  return String(a) + '-' + deuxChiffres(m) + '-' + deuxChiffres(reste + 1);
}

export function comparerDates(a: string, b: string): -1 | 0 | 1 {
  const x = ordinal(a);
  const y = ordinal(b);
  if (x < y) return -1;
  return x > y ? 1 : 0;
}

/** Nombre de jours de `a` à `b` (négatif si `b` est avant `a`). */
export function joursEntre(a: string, b: string): number {
  return ordinal(b) - ordinal(a);
}

export function ajouterJours(date: string, n: number): string {
  const base = ordinal(date);
  if (typeof n !== 'number' || !Number.isSafeInteger(n)) throw new ErreurDate('nombre_invalide');
  return depuisOrdinal(base + n);
}
