// Nombres dits en français convertis par le code ; une forme non comprise donne null, jamais une supposition.
import { centimes, type Centimes } from '../argent/index.js';

const UN9: Record<string, number> = { un: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9 };
const ONZE16: Record<string, number> = { onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16 };
const DIZ: Record<string, number> = { vingt: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60 };
const MAX = BigInt(Number.MAX_SAFE_INTEGER);

function jetons(texte: string): string[] {
  return texte.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/€/gu, ' euros ')
    .split(/[^a-z0-9]+/u).filter((j) => j !== '');
}

/** Suite d'un nombre en soixante ou quatre-vingt (dix, dix-sept, onze à seize), ou null. */
function serieDix(base: number, r: string[]): number | null {
  const [a, b] = r;
  if (a === 'dix') {
    if (r.length === 1) return 10;
    const u = r.length === 2 && b !== undefined ? UN9[b] : undefined;
    return u !== undefined && u >= 7 ? 10 + u : null;
  }
  const o = r.length === 1 && a !== undefined ? ONZE16[a] : undefined;
  return o !== undefined && (base === 80 || o > 11) ? o : null;
}

function suite(base: number, r: string[]): number | null {
  const [a, b] = r;
  if (r.length === 0) return 0;
  if (base === 60 || base === 80) {
    const s = serieDix(base, r);
    if (s !== null) return s;
  }
  if (base === 60 && r.length === 2 && a === 'et' && b === 'onze') return 11;
  if (base !== 80 && r.length === 2 && a === 'et' && b === 'un') return 1;
  const u = r.length === 1 && a !== undefined ? UN9[a] : undefined;
  return u !== undefined && (u > 1 || base === 80) ? u : null;
}

function petit(t: string[]): number | null {
  const [a, b] = t;
  if (a === undefined) return null;
  if (a === 'quatre' && (b === 'vingt' || b === 'vingts')) {
    return b === 'vingts' && t.length > 2 ? null : sommeNulle(80, suite(80, t.slice(2)));
  }
  const d = DIZ[a];
  if (d !== undefined) return sommeNulle(d, suite(d, t.slice(1)));
  if (t.length === 1) return UN9[a] ?? ONZE16[a] ?? (a === 'dix' ? 10 : null);
  return a === 'dix' ? sommeNulle(0, serieDix(0, t)) : null;
}

function sommeNulle(base: number, reste: number | null): number | null {
  return reste === null ? null : base + reste;
}

function groupe(t: string[]): number | null {
  const i = t.findIndex((j) => j === 'cent' || j === 'cents');
  if (i < 0) return petit(t);
  const m = i === 0 ? 1 : i === 1 ? UN9[t[0] ?? ''] : undefined;
  if (m === undefined || (i > 0 && m < 2)) return null;
  if (t[i] === 'cents' && (i === 0 || i < t.length - 1)) return null;
  const reste = t.length > i + 1 ? petit(t.slice(i + 1)) : 0;
  return sommeNulle(m * 100, reste);
}

function entierJetons(t: string[]): number | null {
  if (t.length === 1 && t[0] === 'zero') return 0;
  let etape = 0;
  let total = 0;
  let cur: string[] = [];
  for (const j of t) {
    if (j !== 'mille' && j !== 'million' && j !== 'millions') {
      cur.push(j);
      continue;
    }
    const g = cur.length === 0 && j === 'mille' ? 1 : cur.length === 0 ? null : groupe(cur);
    if (g === null || g < 1 || etape >= (j === 'mille' ? 2 : 1) || (j === 'mille' && cur.length > 0 && g === 1)) return null;
    total += g * (j === 'mille' ? 1000 : 1000000);
    etape = j === 'mille' ? 2 : 1;
    cur = [];
  }
  if (cur.length === 0) return t.length === 0 ? null : total;
  const g = groupe(cur);
  return g === null ? null : total + g;
}

export function motsVersEntier(mots: string): number | null {
  return entierJetons(jetons(mots));
}

const CHIFFRES = /^\d+$/u;

/** Entier lu en chiffres (« 1 234 » ou « 1234 ») ou en mots ; null si incompris ou hors entier sûr. */
function entier(t: string[]): number | null {
  if (t.length === 0) return null;
  if (!t.every((j) => CHIFFRES.test(j))) return t.some((j) => CHIFFRES.test(j)) ? null : entierJetons(t);
  const [premier = '', ...autres] = t;
  if (autres.length > 0 && (premier.length > 3 || autres.some((j) => j.length !== 3))) return null;
  const n = BigInt(t.join(''));
  return n > MAX ? null : Number(n);
}

/** Partie en centimes : 0 à 99 ; un seul chiffre ou un seul mot de 1 à 9 est ambigu sauf avec « centimes ». */
function partieCentimes(t: string[], explicite: boolean): number | null {
  if (t.length === 2 && t[0] === 'zero') {
    const u = UN9[t[1] ?? ''];
    return u === undefined ? null : u;
  }
  if (t.length === 1 && /^\d{2}$/u.test(t[0] ?? '')) return Number(t[0]);
  const n = entier(t);
  if (n === null || n > 99 || (n < 10 && !explicite && t[0] !== 'zero')) return null;
  return n;
}

function total(euros: number, cts: number): Centimes | null {
  const n = BigInt(euros) * 100n + BigInt(cts);
  return n > MAX ? null : centimes(Number(n));
}

export function montantDit(phrase: string): Centimes | null {
  const t = jetons(phrase);
  const v = t.indexOf('virgule');
  if (v >= 0) {
    const droite = t.slice(v + 1);
    if (/^euros?$/u.test(droite[droite.length - 1] ?? '')) droite.pop();
    const e = entier(t.slice(0, v));
    const c = partieCentimes(droite, false);
    return e === null || c === null ? null : total(e, c);
  }
  const i = t.findIndex((j) => j === 'euro' || j === 'euros');
  if (i < 0) {
    const f = t[t.length - 1];
    if (f !== 'centime' && f !== 'centimes') return null;
    const c = partieCentimes(t.slice(0, -1), true);
    return c === null ? null : total(0, c);
  }
  const e = entier(t.slice(0, i));
  let reste = t.slice(i + 1);
  if (e === null) return null;
  if (reste.length === 0) return total(e, 0);
  if (reste[0] === 'et') reste = reste.slice(1);
  const mot = reste[reste.length - 1] === 'centime' || reste[reste.length - 1] === 'centimes';
  const c = partieCentimes(mot ? reste.slice(0, -1) : reste, mot);
  return c === null ? null : total(e, c);
}
