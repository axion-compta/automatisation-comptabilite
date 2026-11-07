import { ErreurPiece, type EtatTraitement } from './types.js';

export const ETAPES = ['entree', 'antivirus', 'preparation', 'lecture', 'classement'] as const;
export type Etape = (typeof ETAPES)[number];

export const TRANSITIONS: Record<EtatTraitement, EtatTraitement[]> = {
  recue: ['quarantaine', 'refusee', 'en_erreur'],
  quarantaine: ['preparee', 'refusee', 'en_erreur'],
  preparee: ['lue', 'a_verifier', 'en_attente_quota', 'en_erreur'],
  en_attente_quota: ['preparee'],
  lue: ['prete', 'a_verifier', 'en_erreur'],
  en_erreur: ['recue', 'quarantaine', 'preparee', 'lue'],
  prete: [],
  a_verifier: [],
  refusee: [],
};

const MS_PAR_MINUTE = 60000;
const ISO_COMPLET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

export function transitionPermise(de: EtatTraitement, vers: EtatTraitement): boolean {
  return TRANSITIONS[de].includes(vers);
}

export function appliquerTransition(de: EtatTraitement, vers: EtatTraitement): EtatTraitement {
  if (!transitionPermise(de, vers)) throw new ErreurPiece('transition_interdite', `Transition interdite : ${de} vers ${vers}.`);
  return vers;
}

export function cleTache(pieceId: string, etape: Etape, versionLecteur: string): string {
  for (const partie of [pieceId, etape, versionLecteur]) {
    if (partie === '' || partie.includes(':')) throw new ErreurPiece('cle_invalide', 'Une partie de clé est vide ou contient « : ».');
  }
  return `${pieceId}:${etape}:${versionLecteur}`;
}

export function prochaineRelance(tentativesFaites: number, delaisMinutes: number[]): number | 'abandon' {
  if (!Number.isSafeInteger(tentativesFaites) || tentativesFaites < 0) throw new ErreurPiece('reglage_invalide', 'Nombre de tentatives invalide.');
  if (delaisMinutes.some((d) => !Number.isFinite(d) || d < 0)) throw new ErreurPiece('reglage_invalide', 'Les délais doivent être finis et positifs ou nuls.');
  return delaisMinutes[tentativesFaites] ?? 'abandon';
}

function instant(iso: string): number {
  const ms = ISO_COMPLET.test(iso) ? Date.parse(iso) : Number.NaN;
  if (Number.isNaN(ms)) throw new ErreurPiece('date_invalide', 'Date ISO complète attendue.');
  return ms;
}

export function estBloquee(enErreurDepuis: string, maintenant: string, dureeMaxMinutes: number): boolean {
  if (!Number.isFinite(dureeMaxMinutes) || dureeMaxMinutes < 0) throw new ErreurPiece('reglage_invalide', 'Durée maximale invalide.');
  const ecartMs = instant(maintenant) - instant(enErreurDepuis);
  return ecartMs >= dureeMaxMinutes * MS_PAR_MINUTE;
}
