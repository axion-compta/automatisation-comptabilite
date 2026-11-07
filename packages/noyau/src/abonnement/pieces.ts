// Orientation des pièces reçues selon l'état d'accès, et reprise de la file sans doublon.
import { ETATS_ACCES, ErreurAbonnement, verifierEmpreinte, verifierHorodatage } from './types.js';
import type { EtatAcces } from './types.js';

export type Orientation = 'traiter' | 'en_attente' | 'refusee';
export type CauseOrientation = 'contrat_termine' | 'etat_acces' | 'plafond_technique' | 'volume' | null;
export type OptionsOrientation = { plafondTechniqueAtteint: boolean; enAttenteVolume: boolean };
export type PieceEnAttente = { id: string; societe: string; empreinte: string; recueLe: string };

export function orienterPiece(
  etat: EtatAcces,
  options: OptionsOrientation,
): { orientation: Orientation; cause: CauseOrientation } {
  if (!ETATS_ACCES.includes(etat)) throw new ErreurAbonnement('etat_voulu_invalide');
  if (etat === 'RESILIE') return { orientation: 'refusee', cause: 'contrat_termine' };
  if (etat === 'LECTURE_SEULE' || etat === 'SUSPENDU') return { orientation: 'en_attente', cause: 'etat_acces' };
  if (options.plafondTechniqueAtteint === true) return { orientation: 'en_attente', cause: 'plafond_technique' };
  if (options.enAttenteVolume === true) return { orientation: 'en_attente', cause: 'volume' };
  return { orientation: 'traiter', cause: null };
}

export function cleDePiece(societe: string, empreinte: string): string {
  return societe + ':' + empreinte;
}

function comparer(a: string, b: string): number {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

export function reprendre(
  file: readonly PieceEnAttente[],
  dejaTraitees: ReadonlySet<string>,
): { aTraiter: PieceEnAttente[]; doublons: string[]; resume: { piecesTraitees: number } } {
  for (const p of file) {
    verifierEmpreinte(p.empreinte);
    verifierHorodatage(p.recueLe);
    if (typeof p.id !== 'string' || p.id === '' || typeof p.societe !== 'string' || p.societe === '') {
      throw new ErreurAbonnement('parametre_invalide');
    }
  }
  const triee = [...file].sort((a, b) => Date.parse(a.recueLe) - Date.parse(b.recueLe) || comparer(a.id, b.id));
  const vues = new Set<string>();
  const aTraiter: PieceEnAttente[] = [];
  const doublons: string[] = [];
  for (const p of triee) {
    const cle = cleDePiece(p.societe, p.empreinte);
    if (dejaTraitees.has(cle) || vues.has(cle)) {
      doublons.push(p.id);
    } else {
      vues.add(cle);
      aTraiter.push(p);
    }
  }
  return { aTraiter, doublons, resume: { piecesTraitees: aTraiter.length } };
}
