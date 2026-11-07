// Même situation, même traitement : pièces comparables classées dans deux comptes différents (V1).
// Limite : la comparaison est en n² ; les pièces sont déjà filtrées par tiers et nature avant l'appel.
import { proportionPointsDeBase } from '../argent/index.js';

export type CodeErreurDivergence = 'seuil_invalide' | 'motif_obligatoire';

export class ErreurDivergence extends Error {
  override name = 'ErreurDivergence';
  readonly code: CodeErreurDivergence;
  constructor(code: CodeErreurDivergence) {
    super(code);
    this.code = code;
  }
}

const PLEIN = 10_000;

export interface PieceClassee {
  id: string;
  tiersId: string;
  nature: string;
  libelle: string;
  compte: string;
  statut: 'valide' | 'brouillon';
}
export type Fermeture = { type: 'corrigee' } | { type: 'voulue'; motif: string };
export interface AlerteDivergence {
  pieceA: string;
  pieceB: string;
  compteA: string;
  compteB: string;
  similarite: number;
  gravite: 'M';
  statut: 'ouverte' | 'fermee';
  fermeture?: Fermeture;
}

function normaliser(texte: string): string {
  return texte.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/gu, ' ').trim();
}

function paires(texte: string): Map<string, number> {
  const compte = new Map<string, number>();
  for (const mot of texte.split(' ')) {
    for (let i = 0; i + 1 < mot.length; i += 1) {
      const p = mot.slice(i, i + 2);
      compte.set(p, (compte.get(p) ?? 0) + 1);
    }
  }
  return compte;
}

/** Coefficient de Dice sur les paires de lettres, en points de base (10 000 = identiques). */
export function similaritePointsDeBase(a: string, b: string): number {
  const na = normaliser(a);
  const nb = normaliser(b);
  if (na === '' || nb === '') return 0;
  if (na === nb) return PLEIN;
  const pa = paires(na);
  const pb = paires(nb);
  let commun = 0;
  let total = 0;
  for (const n of pa.values()) total += n;
  for (const [p, n] of pb) {
    total += n;
    commun += Math.min(n, pa.get(p) ?? 0);
  }
  return proportionPointsDeBase(2 * commun, total, 'demi-superieur') ?? 0;
}

export function detecterDivergences(pieces: readonly PieceClassee[], seuilPointsDeBase: number): AlerteDivergence[] {
  if (!Number.isSafeInteger(seuilPointsDeBase) || seuilPointsDeBase < 0 || seuilPointsDeBase > PLEIN) {
    throw new ErreurDivergence('seuil_invalide');
  }
  const uniques = new Map<string, PieceClassee>();
  for (const p of pieces) if (p.statut === 'valide' && !uniques.has(p.id)) uniques.set(p.id, p);
  const triees = [...uniques.values()].sort((x, y) => (x.id < y.id ? -1 : 1));
  const alertes: AlerteDivergence[] = [];
  triees.forEach((a, i) => {
    for (const b of triees.slice(i + 1)) {
      if (a.tiersId !== b.tiersId || a.nature !== b.nature || a.compte === b.compte) continue;
      const similarite = similaritePointsDeBase(a.libelle, b.libelle);
      if (similarite < seuilPointsDeBase) continue;
      alertes.push({
        pieceA: a.id,
        pieceB: b.id,
        compteA: a.compte,
        compteB: b.compte,
        similarite,
        gravite: 'M',
        statut: 'ouverte',
      });
    }
  });
  return alertes;
}

export function fermerAlerte(alerte: AlerteDivergence, fermeture: Fermeture): AlerteDivergence {
  if (fermeture.type === 'corrigee') return { ...alerte, statut: 'fermee', fermeture: { type: 'corrigee' } };
  const motif = fermeture.motif.trim();
  if (motif === '') throw new ErreurDivergence('motif_obligatoire');
  return { ...alerte, statut: 'fermee', fermeture: { type: 'voulue', motif } };
}
