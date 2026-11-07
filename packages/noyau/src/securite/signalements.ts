import { ErreurSecurite } from './types.js';

export interface Signalement {
  readonly id: string;
  readonly creeLe: Date | string | number;
}

export interface ResultatPurge {
  readonly aPurger: string[];
  readonly illisibles: string[];
}

const instant = (v: unknown): number =>
  v instanceof Date || typeof v === 'string' || typeof v === 'number' ? new Date(v).getTime() : Number.NaN;

export function signalementsAPurger(
  signalements: readonly Signalement[],
  maintenant: Date | string | number,
  fenetreMs: number | undefined,
): ResultatPurge {
  if (fenetreMs === undefined) throw new ErreurSecurite('argument_invalide', 'paramètre de conservation absent');
  if (!Number.isInteger(fenetreMs) || Math.sign(fenetreMs) < 0) {
    throw new ErreurSecurite('argument_invalide', 'paramètre de conservation invalide');
  }
  const t = instant(maintenant);
  if (Number.isNaN(t)) throw new ErreurSecurite('argument_invalide', 'date courante invalide');
  const aPurger: string[] = [];
  const illisibles: string[] = [];
  for (const s of signalements) {
    const c = instant(s.creeLe);
    if (Number.isNaN(c)) illisibles.push(s.id);
    else if (t - c > fenetreMs) aPurger.push(s.id);
  }
  return { aPurger, illisibles };
}

const FORME_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface RapportOutilErreurs {
  readonly correlation_id: string;
  readonly route: string;
  readonly code: string;
}

const texte = (v: unknown): string => (typeof v === 'string' ? v : '');

export function rapportOutilErreurs(source: unknown): RapportOutilErreurs {
  const s = (typeof source === 'object' && source !== null ? source : {}) as Record<string, unknown>;
  const corr = texte(s.correlation_id);
  return {
    correlation_id: FORME_UUID.test(corr) ? corr : 'inconnu',
    route: texte(s.route).replace(/[^a-zA-Z0-9/_{}.-]/g, ''),
    code: texte(s.code).replace(/[^A-Z_a-z]/g, ''),
  };
}
