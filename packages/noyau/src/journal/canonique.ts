import { createHash } from 'node:crypto';

export const FORMAT_CANONIQUE = 1;

export class ErreurJournal extends Error {
  override name = 'ErreurJournal';
  readonly code: 'contenu_invalide' | 'precedente_invalide';
  constructor(code: 'contenu_invalide' | 'precedente_invalide', message: string = code) {
    super(message);
    this.code = code;
  }
}

const HEX_MINUSCULE = /^[0-9a-f]{64}$/;
const invalide = (m: string): never => {
  throw new ErreurJournal('contenu_invalide', m);
};

/** SHA-256 hexadécimal d'une chaîne UTF-8 (exporté pour les tests). */
export function sha256Hex(texte: string): string {
  return createHash('sha256').update(texte, 'utf8').digest('hex');
}

function canon(v: unknown, ancetres: readonly object[]): string {
  if (v === null) return 'null';
  if (typeof v === 'string' || typeof v === 'boolean') return JSON.stringify(v);
  if (typeof v === 'number') return Number.isSafeInteger(v) ? JSON.stringify(v) : invalide('nombre');
  if (typeof v !== 'object') return invalide(typeof v);
  if (ancetres.includes(v)) return invalide('cycle');
  const chemin = [...ancetres, v];
  if (Array.isArray(v)) return `[${Array.from(v, (x: unknown) => canon(x, chemin)).join(',')}]`;
  const proto: unknown = Object.getPrototypeOf(v);
  if (proto !== Object.prototype && proto !== null) return invalide('objet');
  const rec = v as Record<string, unknown>;
  const champs = Object.keys(rec)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canon(rec[k], chemin)}`);
  return `{${champs.join(',')}}`;
}

/** JSON aux clés triées, sans espaces ; montants en centimes entiers. */
export function contenuCanonique(valeur: unknown): string {
  return canon(valeur, []);
}

export function empreinteChainee(precedente: string, valeur: unknown): string {
  if (typeof precedente !== 'string' || !HEX_MINUSCULE.test(precedente)) {
    throw new ErreurJournal('precedente_invalide');
  }
  return sha256Hex(`${precedente}\n${contenuCanonique(valeur)}`);
}

export function empreinteInitiale(societeId: string, creeLe: string): string {
  for (const t of [societeId, creeLe]) {
    if (typeof t !== 'string' || t === '') invalide('texte');
  }
  return sha256Hex(contenuCanonique({ societeId, creeLe, formatCanonique: FORMAT_CANONIQUE }));
}
