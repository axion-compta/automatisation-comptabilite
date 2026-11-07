// Lecture pure de la requête de recherche (spec 15, RE-R1 et RE-R3).
import { centimes, type Centimes } from '../argent/index.js';

export class ErreurRequete extends Error {
  override name = 'ErreurRequete';
  constructor(readonly code: 'requete_invalide') {
    super(code);
  }
}

export type RequeteLue = {
  mots: string[];
  dernierEnPrefixe: boolean;
  montantCentimes?: Centimes;
  siren?: string;
};

/** Minuscules, sans accents, espaces multiples réduits. */
export function normaliser(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Espaces permis entre groupes de 3 chiffres : normale, insécable, fine insécable.
const MONTANT = /^(\d{1,3}(?:[ \u00A0\u202F]\d{3})+|\d+)(?:,(\d{1,2}))?(?:[ \u00A0\u202F]?€)?$/u;
const SIREN = /^(?:\d{9}|\d{3}[ \u00A0\u202F]\d{3}[ \u00A0\u202F]\d{3})$/u;
const MAXIMUM = BigInt(Number.MAX_SAFE_INTEGER);

function lireMontant(texte: string): Centimes | undefined {
  const m = MONTANT.exec(texte);
  if (!m) return undefined;
  const entier = (m[1] ?? '').replace(/[ \u00A0\u202F]/gu, '');
  const decimales = (m[2] ?? '').padEnd(2, '0');
  const total = BigInt(entier + decimales);
  if (total > MAXIMUM) return undefined;
  return centimes(Number(total));
}

function lireSiren(texte: string): string | undefined {
  return SIREN.test(texte) ? texte.replace(/[ \u00A0\u202F]/gu, '') : undefined;
}

export function lireRequete(q: string, bornes: { min: number; max: number }): RequeteLue {
  const propre = q.trim();
  const longueur = [...propre].length;
  if (longueur < bornes.min || longueur > bornes.max) throw new ErreurRequete('requete_invalide');
  const mots = normaliser(propre).split(' ').filter((m) => m !== '');
  const lue: RequeteLue = { mots, dernierEnPrefixe: mots.length > 0 };
  const montant = lireMontant(propre);
  if (montant !== undefined) lue.montantCentimes = montant;
  const siren = lireSiren(propre);
  if (siren !== undefined) lue.siren = siren;
  return lue;
}

/** Vrai si un mot du texte normalisé égale `mot`, ou commence par lui si `prefixe`. */
export function correspondMot(texteNormalise: string, mot: string, prefixe: boolean): boolean {
  return texteNormalise
    .split(' ')
    .some((t) => (prefixe ? t.startsWith(mot) : t === mot));
}
