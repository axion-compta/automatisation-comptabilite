// Exports : neutralisation des formules dans toute cellule texte (EX-R4).
// La base n'est jamais modifiée : on ne fait que produire une valeur de cellule.

/** Mêmes 5 valeurs que le catalogue d'export du contrat : le noyau n'importe jamais le contrat. */
export type TypeColonne = 'texte' | 'entier' | 'centimes' | 'date' | 'booleen';

export type Cellule =
  | { genre: 'texte'; valeur: string }
  | { genre: 'nombre'; valeur: string }
  | { genre: 'date'; valeur: string };

export class ErreurNeutralisation extends Error {
  readonly code: 'type_invalide';
  constructor(code: 'type_invalide') {
    super(code);
    this.name = 'ErreurNeutralisation';
    this.code = code;
  }
}

/** = + - @ tabulation retour-chariot saut-de-ligne, puis les quatre variantes pleine chasse. */
export const CARACTERES_DANGEREUX: readonly string[] = Object.freeze(
  [0x3d, 0x2b, 0x2d, 0x40, 0x09, 0x0d, 0x0a, 0xff1d, 0xff0b, 0xff0d, 0xff20].map((p) => String.fromCodePoint(p)),
);

const POINTS_DANGEREUX: readonly number[] = CARACTERES_DANGEREUX.map((c) => c.codePointAt(0)!);
const APOSTROPHE = String.fromCodePoint(0x27);
const FORME_DATE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const JOURS_MOIS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function neutraliserTexte(v: string): string {
  const premier = v.codePointAt(0);
  if (premier !== undefined && POINTS_DANGEREUX.includes(premier)) return APOSTROPHE + v;
  return v;
}

function bissextile(a: number): boolean {
  return (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0;
}

function dateCivile(s: string): boolean {
  if (!FORME_DATE.test(s)) return false;
  const a = Number(s.slice(0, 4));
  const m = Number(s.slice(5, 7));
  const j = Number(s.slice(8, 10));
  if (a < 1000 || m < 1 || m > 12) return false;
  const max = m === 2 && bissextile(a) ? 29 : JOURS_MOIS[m - 1]!;
  return j >= 1 && j <= max;
}

function texte(v: unknown): Cellule {
  if (v === null || v === undefined) return { genre: 'texte', valeur: '' };
  if (typeof v === 'string') return { genre: 'texte', valeur: neutraliserTexte(v) };
  if (typeof v === 'number' || typeof v === 'bigint' || typeof v === 'boolean') {
    return { genre: 'texte', valeur: neutraliserTexte(String(v)) };
  }
  throw new ErreurNeutralisation('type_invalide');
}

export function cellule(valeur: unknown, type: TypeColonne): Cellule {
  if (valeur !== null && valeur !== undefined && typeof valeur === 'object') {
    throw new ErreurNeutralisation('type_invalide');
  }
  if (type === 'entier' || type === 'centimes') {
    if (typeof valeur === 'number' && Number.isSafeInteger(valeur)) {
      return { genre: 'nombre', valeur: String(valeur) };
    }
  } else if (type === 'date') {
    if (typeof valeur === 'string' && dateCivile(valeur)) return { genre: 'date', valeur };
  } else if (type === 'booleen') {
    if (typeof valeur === 'boolean') return { genre: 'nombre', valeur: valeur ? '1' : '0' };
  }
  return texte(valeur);
}
