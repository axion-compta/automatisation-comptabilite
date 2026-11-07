// Voix : dates relatives, SIREN et IBAN dictés (V3-CHT-062). Calcul sur des dates civiles, jamais sur Date ni fuseau.
import { ErreurChat } from '../chat/types.js';
import { motsVersEntier } from './nombres.js';

const MOIS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const CHIFFRES_MOTS = ['zero', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
const CHIFFRES = /^[0-9]+$/u;
const FORME_ISO = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/u;
const SEPT_JOURS = JOURS.length;
const LONGUEURS_IBAN = { min: 15, max: 34 } as const;
const CHIFFRES_SIREN = 9;
const RELATIFS: Record<string, number> = { 'aujourd hui': 0, hier: -1, 'avant hier': -2, demain: 1 };

function jetons(texte: string): string[] {
  return texte.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').split(/[^a-z0-9]+/u).filter((j) => j !== '');
}

const bissextile = (a: number): boolean => (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0;
const joursDuMois = (a: number, m: number): number => (m === 2 ? (bissextile(a) ? 29 : 28) : [4, 6, 9, 11].includes(m) ? 30 : 31);
const valide = (a: number, m: number, j: number): boolean =>
  Number.isInteger(a) && a >= 1000 && a <= 9999 && m >= 1 && m <= 12 && j >= 1 && j <= joursDuMois(a, m);

const ANNEE_MIN = 1000;
const longueurAn = (a: number): number => (bissextile(a) ? 366 : 365);

/** Rang du jour depuis le 1er janvier de l'an 1000 (sans division : parcours des années et des mois). */
function jourDepuisOrigine(a: number, m: number, j: number): number {
  let n = j - 1;
  for (let an = ANNEE_MIN; an < a; an++) n += longueurAn(an);
  for (let mo = 1; mo < m; mo++) n += joursDuMois(a, mo);
  return n;
}

function civil(rang: number): [number, number, number] {
  let n = rang;
  let a = ANNEE_MIN;
  while (n >= longueurAn(a)) n -= longueurAn(a++);
  let m = 1;
  while (n >= joursDuMois(a, m)) n -= joursDuMois(a, m++);
  return [a, m, n + 1];
}

// Repère de calendrier : le 15 mars 2026 est un dimanche (JOURS[0]).
const RANG_DIMANCHE = jourDepuisOrigine(2026, 3, 15);
const jourDeSemaine = (rang: number): number => (((rang - RANG_DIMANCHE) % SEPT_JOURS) + SEPT_JOURS) % SEPT_JOURS;

const iso = (a: number, m: number, j: number): string => `${String(a).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(j).padStart(2, '0')}`;
const decaler = (n: number): string => iso(...civil(n));

function entierDit(t: string[]): number | null {
  if (t.length === 1 && (t[0] === 'premier' || t[0] === '1er')) return 1;
  if (t.length === 1 && CHIFFRES.test(t[0]!)) return Number(t[0]);
  return t.length === 0 ? null : motsVersEntier(t.join(' '));
}

export function dateDite(phrase: string, aujourdhui: string): string | null {
  const f = FORME_ISO.exec(aujourdhui);
  const [a, m, j] = f ? [Number(f[1]), Number(f[2]), Number(f[3])] : [0, 0, 0];
  if (!f || !valide(a, m, j)) throw new ErreurChat('parametre_invalide');
  const n = jourDepuisOrigine(a, m, j);
  const t = jetons(phrase);
  const decalage = RELATIFS[t.join(' ')];
  if (decalage !== undefined) return decaler(n + decalage);
  const sansLe = t[0] === 'le' ? t.slice(1) : t;
  const jourSemaine = JOURS.indexOf(sansLe[0] ?? '');
  if (jourSemaine >= 0 && sansLe.length === 2 && sansLe[1] === 'dernier') {
    return decaler(n - (((jourDeSemaine(n) - jourSemaine + SEPT_JOURS) % SEPT_JOURS) || SEPT_JOURS));
  }
  const iMois = sansLe.findIndex((x) => MOIS.includes(x));
  if (iMois < 1) return null;
  const jour = entierDit(sansLe.slice(0, iMois));
  const mois = MOIS.indexOf(sansLe[iMois]!) + 1;
  const reste = sansLe.slice(iMois + 1);
  if (jour === null) return null;
  if (reste.length > 0) {
    const an = entierDit(reste);
    return an !== null && valide(an, mois, jour) ? iso(an, mois, jour) : null;
  }
  if (!valide(a, mois, jour)) return null;
  const annee = jourDepuisOrigine(a, mois, jour) > n ? a - 1 : a;
  return valide(annee, mois, jour) ? iso(annee, mois, jour) : null;
}

export function chiffresDits(phrase: string, strict = false): string | null {
  const t = jetons(phrase);
  if (t.length === 0) return null;
  const lus = t.map((x) => (CHIFFRES.test(x) ? x : CHIFFRES_MOTS.includes(x) ? String(CHIFFRES_MOTS.indexOf(x)) : null));
  if (lus.every((x) => x !== null)) return lus.join('');
  if (strict) return null;
  const n = motsVersEntier(t.join(' '));
  return n === null ? null : String(n);
}

export function sirenDit(phrase: string): string | null {
  const c = chiffresDits(phrase, true);
  return c !== null && c.length === CHIFFRES_SIREN ? c : null;
}

export function ibanDit(phrase: string): string | null {
  const iban = jetons(phrase)
    .map((x) => (CHIFFRES_MOTS.includes(x) ? String(CHIFFRES_MOTS.indexOf(x)) : x.toUpperCase()))
    .join('');
  const bonneLongueur = iban.length >= LONGUEURS_IBAN.min && iban.length <= LONGUEURS_IBAN.max;
  return bonneLongueur && /^[A-Z]{2}[A-Z0-9]+$/u.test(iban) ? iban : null;
}
