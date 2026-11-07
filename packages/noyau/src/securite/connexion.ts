import { ErreurSecurite, type OperationSensible } from './types.js';

export type Revendications = { acr?: string; authTime?: number };
export type ReglagesConnexion = { reauthMaxMs: number; attenteApresRecuperationMs: number };
export type VerdictNiveau =
  | { ok: true }
  | { ok: false; raison: 'non_authentifie' | 'mfa_requis' | 'reauthentification_requise' | 'recuperation_recente' };

const MS_PAR_SECONDE = 1000;

const entier = (n: unknown): number =>
  typeof n === 'number' && Number.isSafeInteger(n) && n >= 0
    ? n
    : ((): never => {
        throw new ErreurSecurite('argument_invalide', 'entier positif ou nul attendu');
      })();

const refus = (raison: Exclude<VerdictNiveau, { ok: true }>['raison']): VerdictNiveau => ({ ok: false, raison });

export function exigerNiveau(
  revendications: Revendications | undefined,
  operation: OperationSensible | 'ordinaire',
  maintenantMs: number,
  reglages: ReglagesConnexion,
  derniereRecuperationMs?: number,
): VerdictNiveau {
  const reauthMax = entier(reglages?.reauthMaxMs);
  const attente = entier(reglages.attenteApresRecuperationMs);
  const maintenant = entier(maintenantMs);
  const recuperation = derniereRecuperationMs === undefined ? undefined : entier(derniereRecuperationMs);
  if (revendications === undefined || revendications === null) return refus('non_authentifie');
  if (revendications.acr !== 'mfa') return refus('mfa_requis');
  if (operation === 'ordinaire') return { ok: true };
  const debut = (revendications.authTime ?? NaN) * MS_PAR_SECONDE;
  if (!Number.isFinite(debut) || debut > maintenant || maintenant - debut > reauthMax) {
    return refus('reauthentification_requise');
  }
  if (recuperation !== undefined && maintenant - recuperation < attente) return refus('recuperation_recente');
  return { ok: true };
}
