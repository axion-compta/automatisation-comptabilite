// Lien de téléchargement d'un export : lié à la session et à la société, de courte durée (durée en paramètre).
import {
  cheminExport,
  ErreurEtancheite,
  exportAccessible,
  REPONSE_INTROUVABLE,
  type ReponseIntrouvable,
} from '../../../../packages/noyau/src/principes/etancheite.js';
import { creerLienExpirant, lireLienExpirant, type Signataire } from '../documents/lien-expirant.js';

export interface StockageExports {
  lire(chemin: string): Promise<Uint8Array | null>;
}
export interface SessionExport {
  sessionId: string;
  societeId: string;
}
export class ErreurLienExport extends Error {
  override name = 'ErreurLienExport';
  readonly code: 'session_invalide';
  constructor(code: 'session_invalide') {
    super(code);
    this.code = code;
  }
}
export interface LienCree {
  statutHttp: 201;
  url: string;
  expireLe: string;
}
export type Telechargement = { statutHttp: 200; octets: Uint8Array } | { statutHttp: 410; code: 'lien_expire' } | ReponseIntrouvable;

const PREFIXE_URL = '/exports/telechargement/';

function verifierSession(s: SessionExport): void {
  if (typeof s.sessionId !== 'string' || s.sessionId === '') throw new ErreurLienExport('session_invalide');
  if (typeof s.societeId !== 'string' || s.societeId === '') {
    throw new ErreurEtancheite('session_sans_societe', 'La session ne porte aucune société.');
  }
}

function lireObjet(objetId: string): [string, string] | null {
  try {
    const v: unknown = JSON.parse(objetId);
    return Array.isArray(v) && v.length === 2 && typeof v[0] === 'string' && typeof v[1] === 'string' ? [v[0], v[1]] : null;
  } catch {
    return null;
  }
}

export function creerLiensExport(
  ports: { stockage: StockageExports; signataire: Signataire },
  parametres: { dureeLienMs: number },
) {
  const { stockage, signataire } = ports;

  async function demanderLienExport(session: SessionExport, nomFichier: string, maintenantMs: number): Promise<LienCree | ReponseIntrouvable> {
    verifierSession(session);
    const chemin = cheminExport(session.societeId, nomFichier);
    if ((await stockage.lire(chemin)) === null) return REPONSE_INTROUVABLE;
    const objetId = JSON.stringify([session.sessionId, nomFichier]);
    const { jeton, expireLe } = await creerLienExpirant(
      { societeId: session.societeId, objetId, maintenantMs, dureeMs: parametres.dureeLienMs },
      signataire,
    );
    return { statutHttp: 201, url: PREFIXE_URL + jeton, expireLe: new Date(expireLe).toISOString() };
  }

  async function telechargerExport(jeton: string, session: SessionExport, maintenantMs: number): Promise<Telechargement> {
    const lu = await lireLienExpirant(jeton, { societeId: session.societeId, maintenantMs }, signataire);
    if (!lu.ok) return lu.code === 'lien_expire' ? { statutHttp: 410, code: 'lien_expire' } : REPONSE_INTROUVABLE;
    const objet = lireObjet(lu.objetId);
    if (objet === null || objet[0] !== session.sessionId) return REPONSE_INTROUVABLE;
    let chemin: string;
    try {
      chemin = cheminExport(session.societeId, objet[1]);
    } catch {
      return REPONSE_INTROUVABLE;
    }
    if (!exportAccessible(chemin, session)) return REPONSE_INTROUVABLE;
    const octets = await stockage.lire(chemin);
    return octets === null ? REPONSE_INTROUVABLE : { statutHttp: 200, octets };
  }

  return { demanderLienExport, telechargerExport };
}
