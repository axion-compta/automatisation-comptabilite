// Lecture d'un barème IK daté : tout vient de la valeur du paramètre, rien n'est en dur.
// Les décimaux sont lus comme du texte (aucun flottant dans le noyau).
import { centimes, type Centimes } from '../argent/index.js';
import { ErreurFrais } from './types.js';

export interface TrancheIk {
  jusquaKmDixiemes: number | null;
  tauxMilliemes: number;
  fixeCentimes: Centimes;
}

export interface PuissanceIk {
  cleCv: number;
  tranches: TrancheIk[];
}

export interface BaremeIk {
  puissances: PuissanceIk[];
}

const BASE = 10;
const DECIMALES_MILLIEMES = 3;
const DECIMALES_CENTIMES = 2;
const DIXIEMES_PAR_KM = 10;
const SIMPLE = /^(\d+)(?:[,.](\d+))?$/;
const GROUPES = /^(\d+|\d{1,3}(?:[ \u00a0\u202f]\d{3})+)(?:[,.](\d+))?$/;

function invalide(message: string): ErreurFrais {
  return new ErreurFrais('entree_invalide', message);
}

function entierSur(n: number, nom: string): number {
  if (!Number.isSafeInteger(n)) throw invalide(nom + ' hors limites.');
  return n;
}

/** Lit un décimal positif écrit en texte et le rend en unités de 10^-decimales. */
function lireDecimal(texte: unknown, motif: RegExp, decimales: number, nom: string): number {
  const m = typeof texte === 'string' ? motif.exec(texte) : null;
  if (!m) throw invalide(nom + ' mal formé.');
  const fraction = m[2] ?? '';
  if (fraction.length > decimales) throw invalide(nom + ' : trop de décimales.');
  const echelle = Number(String(BASE) + '0'.repeat(decimales - 1));
  const entier = Number((m[1] ?? '').replace(/\D/g, ''));
  return entierSur(entier * echelle + Number(fraction.padEnd(decimales, '0')), nom);
}

/** `0,636` ou `0.636` rendent 636 ; trois décimales au plus. */
export function lireTauxMilliemes(texte: string): number {
  return lireDecimal(texte, SIMPLE, DECIMALES_MILLIEMES, 'Taux');
}

/** `1395` ou `1 395,00` rendent 139500 ; deux décimales au plus. */
export function lireMontantCentimes(texte: string): Centimes {
  return centimes(lireDecimal(texte, GROUPES, DECIMALES_CENTIMES, 'Montant'));
}

function entierPositif(v: unknown, nom: string): number {
  if (typeof v !== 'number' || !Number.isSafeInteger(v) || v <= 0) throw invalide(nom + ' : entier strictement positif attendu.');
  return v;
}

function lireTranche(brut: unknown): TrancheIk {
  const t = brut as { jusqua_km?: unknown; taux?: unknown; fixe?: unknown } | null;
  if (typeof t !== 'object' || t === null) throw invalide('Tranche invalide.');
  const borne = t.jusqua_km === null ? null : entierSur(entierPositif(t.jusqua_km, 'Borne') * DIXIEMES_PAR_KM, 'Borne');
  return { jusquaKmDixiemes: borne, tauxMilliemes: lireTauxMilliemes(t.taux as string), fixeCentimes: lireMontantCentimes(t.fixe as string) };
}

function lirePuissance(brut: unknown): PuissanceIk {
  const p = brut as { cv?: unknown; tranches?: unknown } | null;
  if (typeof p !== 'object' || p === null || !Array.isArray(p.tranches) || p.tranches.length === 0) throw invalide('Puissance invalide.');
  const tranches = p.tranches.map(lireTranche).sort((a, b) => (a.jusquaKmDixiemes ?? Infinity) - (b.jusquaKmDixiemes ?? Infinity));
  tranches.forEach((t, i) => {
    const derniere = i === tranches.length - 1;
    const precedente = tranches[i - 1]?.jusquaKmDixiemes ?? 0;
    if (derniere !== (t.jusquaKmDixiemes === null)) throw invalide('Seule la dernière tranche est sans limite.');
    if (t.jusquaKmDixiemes !== null && t.jusquaKmDixiemes <= precedente) throw invalide('Bornes non strictement croissantes.');
  });
  return { cleCv: entierPositif(p.cv, 'Puissance'), tranches };
}

export function lireBaremeIk(valeur: string): BaremeIk {
  let donnees: unknown;
  try {
    donnees = JSON.parse(valeur);
  } catch {
    throw invalide('JSON invalide.');
  }
  const liste = Array.isArray(donnees) ? donnees : (donnees as { puissances?: unknown } | null)?.puissances;
  if (!Array.isArray(liste) || liste.length === 0) throw invalide('Aucune puissance.');
  const puissances = liste.map(lirePuissance).sort((a, b) => a.cleCv - b.cleCv);
  if (new Set(puissances.map((p) => p.cleCv)).size !== puissances.length) throw invalide('Puissances en double.');
  return { puissances };
}

/** Majoration en pourcentage entier. */
export function lireMajoration(valeur: string): number {
  if (!/^\d+$/.test(valeur)) throw invalide('Majoration : entier positif attendu.');
  return entierSur(Number(valeur), 'Majoration');
}

/** Plus petite clé supérieure ou égale ; au-delà de la plus grande, la plus grande. */
export function ligneDePuissance(bareme: BaremeIk, puissanceCv: number): PuissanceIk {
  if (!Number.isSafeInteger(puissanceCv) || puissanceCv <= 0) throw invalide('Puissance invalide.');
  const derniere = bareme.puissances[bareme.puissances.length - 1];
  const ligne = bareme.puissances.find((p) => p.cleCv >= puissanceCv) ?? derniere;
  if (!ligne) throw invalide('Aucune puissance.');
  return ligne;
}
