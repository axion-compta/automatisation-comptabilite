// Lien signé de courte durée, lié à une société. La clé reste derrière le port Signataire (coffre), jamais ici.
export interface Signataire {
  signer(charge: string): Promise<string>;
  verifier(charge: string, signature: string): Promise<boolean>;
}
export class ErreurLienExpirant extends Error {
  override name = 'ErreurLienExpirant';
  readonly code = 'duree_invalide';
  constructor() {
    super('duree_invalide');
  }
}
export type LectureLien = { ok: true; objetId: string } | { ok: false; code: 'introuvable' | 'lien_expire' };

const SEPARATEUR = '.';
const AUCUNE = 0;
const enBase64 = (t: string): string => Buffer.from(t, 'utf8').toString('base64url');
const depuisBase64 = (t: string): string => Buffer.from(t, 'base64url').toString('utf8');
const INTROUVABLE: LectureLien = { ok: false, code: 'introuvable' };

export async function creerLienExpirant(
  e: { societeId: string; objetId: string; maintenantMs: number; dureeMs: number },
  signataire: Signataire,
): Promise<{ jeton: string; expireLe: number }> {
  if (!Number.isSafeInteger(e.dureeMs) || e.dureeMs <= AUCUNE) throw new ErreurLienExpirant();
  const expireLe = e.maintenantMs + e.dureeMs;
  const charge = enBase64(JSON.stringify([e.societeId, e.objetId, expireLe]));
  return { jeton: charge + SEPARATEUR + (await signataire.signer(charge)), expireLe };
}

function lireCharge(charge: string): [string, string, number] | null {
  try {
    const v: unknown = JSON.parse(depuisBase64(charge));
    const bon = Array.isArray(v) && v.length === 3 && typeof v[0] === 'string' && typeof v[1] === 'string' && Number.isFinite(v[2]);
    return bon ? (v as [string, string, number]) : null;
  } catch {
    return null;
  }
}

export async function lireLienExpirant(
  jeton: string,
  e: { societeId: string; maintenantMs: number },
  signataire: Signataire,
): Promise<LectureLien> {
  const morceaux = typeof jeton === 'string' ? jeton.split(SEPARATEUR) : [];
  const [charge, signature] = morceaux;
  if (morceaux.length !== 2 || !charge || !signature) return INTROUVABLE;
  if (!(await signataire.verifier(charge, signature))) return INTROUVABLE;
  const lu = lireCharge(charge);
  if (lu === null || lu[0] !== e.societeId) return INTROUVABLE;
  return e.maintenantMs >= lu[2] ? { ok: false, code: 'lien_expire' } : { ok: true, objetId: lu[1] };
}
