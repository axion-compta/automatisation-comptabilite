import type { LigneRegistre } from '../rgpd/registre.js';

export interface Escalade {
  readonly role: 'dpo';
  readonly motif: 'traitement_hors_registre';
  readonly finalite: string;
}
export type VerdictTraitement = { readonly accepte: true } | { readonly accepte: false; readonly escalade: Escalade };

const forme = (t: string): string => t.trim().toLowerCase();

/** Refuse toute finalité absente du registre et l'escalade au délégué à la protection des données. */
export function verifierTraitement(finalite: string, registre: readonly Pick<LigneRegistre, 'finalite'>[]): VerdictTraitement {
  const f = forme(finalite);
  if (f !== '' && registre.some((l) => forme(l.finalite) === f)) return { accepte: true };
  return { accepte: false, escalade: { role: 'dpo', motif: 'traitement_hors_registre', finalite } };
}
