// Doublons entre sources : fusion seulement si l'appariement est unique, suspects proposés, jamais de suppression.
import { soustraire, type Centimes } from '../argent/index.js';
import { ajouterJours, comparerDates } from '../dates/civiles.js';
import { atteint } from './libelles/similarite.js';
import type { EtatRapprochement, EtatTechnique } from './types.js';

export class ErreurDoublonsSources extends Error {
  constructor(readonly code: 'tolerance_invalide' | 'ids_identiques' | 'ligne_inconnue' | 'decision_incomplete' | 'pas_en_attente' | 'pas_completee') {
    super(code);
    this.name = 'ErreurDoublonsSources';
  }
}

export interface LigneSource {
  id: string;
  compteId: string;
  dateOperation: string;
  montant: Centimes;
  libelleBrut: string;
  libelleNormalise: string;
  idExterne?: string;
  empreinte: string;
  sources: readonly string[];
  libelleSecondaire?: string;
  etatTechnique: EtatTechnique;
  etatRapprochement: EtatRapprochement;
  doublonDe?: string;
  decidePar?: string;
  motifDoublon?: string;
}
export interface OptionsAppariement {
  seuilSimilaritePb: number;
  joursTolerance: number;
}
export type Appariement = { type: 'fusion'; ligneId: string } | { type: 'suspects'; ligneIds: string[] } | { type: 'nouvelle' };

function proche(a: string, b: string, jours: number): boolean {
  return comparerDates(a, ajouterJours(b, -jours)) >= 0 && comparerDates(a, ajouterJours(b, jours)) <= 0;
}

function decider(ids: string[]): Appariement {
  if (ids.length === 0) return { type: 'nouvelle' };
  const [seul] = ids;
  return seul !== undefined && ids.length === 1 ? { type: 'fusion', ligneId: seul } : { type: 'suspects', ligneIds: ids };
}

export function apparier(nouvelle: LigneSource, existantes: readonly LigneSource[], options: OptionsAppariement): Appariement {
  atteint('', '', options.seuilSimilaritePb);
  if (!Number.isSafeInteger(options.joursTolerance) || options.joursTolerance < 0) throw new ErreurDoublonsSources('tolerance_invalide');
  const autres = existantes.filter((e) => e.compteId === nouvelle.compteId && e.etatRapprochement !== 'IGNOREE' && !e.sources.some((s) => nouvelle.sources.includes(s)));
  if (nouvelle.idExterne !== undefined) {
    const memeId = autres.filter((e) => e.idExterne === nouvelle.idExterne);
    if (memeId.length > 0) return decider(memeId.map((e) => e.id));
  }
  const candidates = autres.filter(
    (e) =>
      (e.idExterne === undefined || nouvelle.idExterne === undefined) &&
      e.montant === nouvelle.montant &&
      proche(nouvelle.dateOperation, e.dateOperation, options.joursTolerance) &&
      atteint(nouvelle.libelleNormalise, e.libelleNormalise, options.seuilSimilaritePb),
  );
  return decider(candidates.map((e) => e.id));
}

export function fusionner(existante: LigneSource, nouvelle: LigneSource): LigneSource {
  const plusLong = nouvelle.libelleBrut.length > existante.libelleBrut.length ? nouvelle.libelleBrut : existante.libelleBrut;
  const ajoutees = nouvelle.sources.filter((s) => !existante.sources.includes(s));
  return { ...existante, sources: [...existante.sources, ...ajoutees], libelleSecondaire: plusLong };
}

export function confirmerDoublon(
  lignes: readonly LigneSource[],
  d: { conserveeId: string; doublonId: string; decidePar: string; motif: string },
): LigneSource[] {
  if (d.conserveeId === d.doublonId) throw new ErreurDoublonsSources('ids_identiques');
  if (d.decidePar === '' || d.motif === '') throw new ErreurDoublonsSources('decision_incomplete');
  if (!lignes.some((l) => l.id === d.conserveeId) || !lignes.some((l) => l.id === d.doublonId)) throw new ErreurDoublonsSources('ligne_inconnue');
  return lignes.map((l) => (l.id === d.doublonId ? { ...l, etatRapprochement: 'IGNOREE', doublonDe: d.conserveeId, decidePar: d.decidePar, motifDoublon: d.motif } : l));
}

export function completerEnAttente(attente: LigneSource, completee: LigneSource): { ligne: LigneSource; ecart?: Centimes } {
  if (attente.etatTechnique !== 'en_attente') throw new ErreurDoublonsSources('pas_en_attente');
  if (completee.etatTechnique !== 'completee') throw new ErreurDoublonsSources('pas_completee');
  const ligne: LigneSource = { ...attente, montant: completee.montant, etatTechnique: 'completee' };
  return completee.montant === attente.montant ? { ligne } : { ligne, ecart: soustraire(completee.montant, attente.montant) };
}
