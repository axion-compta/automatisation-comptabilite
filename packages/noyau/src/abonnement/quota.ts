// Quota atteint (continuer ou attendre) et plafond technique d'IA. Aucun montant ici.
import { reprendre } from './pieces.js';
import type { PieceEnAttente } from './pieces.js';
import { ErreurAbonnement, verifierEntier } from './types.js';

export type ComportementQuota = 'continuer' | 'attente';
export type EtatQuota = { depasse: boolean; enAttenteVolume: boolean; proposerChoix: boolean };
export type MotifLiberation = 'nouveau_mois' | 'nouveau_palier';

const MOTIFS: readonly string[] = ['nouveau_mois', 'nouveau_palier'];
const PLANCHER_COMPRIS = 1;
const PLANCHER_NUL = 0;

export function etatQuota(p: { dejaTraitees: number; compris: number; comportement?: string }): EtatQuota {
  if (typeof p.compris !== 'number' || !Number.isSafeInteger(p.compris) || p.compris < PLANCHER_COMPRIS) {
    throw new ErreurAbonnement('palier_invalide');
  }
  verifierEntier(p.dejaTraitees, PLANCHER_NUL);
  const depasse = p.dejaTraitees >= p.compris;
  const attente = p.comportement === 'attente';
  return { depasse, enAttenteVolume: attente && depasse, proposerChoix: depasse };
}

export function plafondTechniqueAtteint(consommeMicroCentimes: number, plafondMicroCentimes: number): boolean {
  verifierEntier(consommeMicroCentimes, PLANCHER_NUL);
  verifierEntier(plafondMicroCentimes, PLANCHER_NUL);
  return consommeMicroCentimes >= plafondMicroCentimes;
}

export function libererAttenteVolume(
  file: readonly PieceEnAttente[],
  dejaTraitees: ReadonlySet<string>,
  motif: MotifLiberation,
): ReturnType<typeof reprendre> {
  if (!MOTIFS.includes(motif)) throw new ErreurAbonnement('parametre_invalide');
  return reprendre(file, dejaTraitees);
}
