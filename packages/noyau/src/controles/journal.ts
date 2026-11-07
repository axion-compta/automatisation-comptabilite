// Journal de vérification en mémoire : ajout seul. Aucun texte affiché : seulement des codes.
import type { TraceControle } from './moteur.js';

export interface LigneJournal extends TraceControle {
  versionParametres: string;
}

export class ErreurJournal extends Error {
  override name = 'ErreurJournal';
  readonly code = 'version_parametres_absente';
  constructor() {
    super('version_parametres_absente');
  }
}

/** Rend un NOUVEAU tableau figé ; le journal reçu n'est jamais modifié. */
export function ajouterAuJournal(
  journal: readonly LigneJournal[],
  traces: readonly TraceControle[],
  versionParametres: string,
): readonly LigneJournal[] {
  if (versionParametres.trim() === '') throw new ErreurJournal();
  const nouvelles = traces.map((t) => Object.freeze({ ...t, versionParametres }));
  return Object.freeze([...journal, ...nouvelles]);
}

const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Tout ce qui a été vérifié pour un objet, trié par horodatage puis règle. */
export function historiqueObjet(
  journal: readonly LigneJournal[],
  objetType: string,
  objetId: string,
): LigneJournal[] {
  return journal
    .filter((l) => l.objetType === objetType && l.objetId === objetId)
    .sort((a, b) => compare(a.horodatage, b.horodatage) || compare(a.regleId, b.regleId));
}

/** Dernière ligne (horodatage le plus récent ; à égalité, la plus tardive du journal). */
export function dernierResultat(
  journal: readonly LigneJournal[],
  regleId: string,
  objetId: string,
): LigneJournal | undefined {
  let dernier: LigneJournal | undefined;
  for (const l of journal) {
    if (l.regleId !== regleId || l.objetId !== objetId) continue;
    if (dernier === undefined || l.horodatage >= dernier.horodatage) dernier = l;
  }
  return dernier;
}
