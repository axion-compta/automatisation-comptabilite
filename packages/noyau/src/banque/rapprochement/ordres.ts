// Rapprochement rejoué dans trois ordres (graines enregistrées) : tout lien qui change selon l'ordre passe DOUTEUSE.
import { sha256Hex } from '../../journal/canonique.js';
import type { EtatRapprochement, Lien } from '../types.js';
import { rapprocher, type Entree, type Reglage, type Resultat } from './passes.js';

export class ErreurOrdres extends Error {
  override name = 'ErreurOrdres';
  constructor(readonly code: 'graine_invalide') {
    super(code);
  }
}

export const CODE_DEPEND_ORDRE = 'depend_de_l_ordre';
export type Graines = readonly [number, number, number];
export type Execution = { graines: Graines; empreinteResultat: string; ecartEntreOrdres: boolean; notes: string[] };
export type ResultatOrdres = { liens: Lien[]; etats: Record<string, EtatRapprochement>; options: Record<string, string[]>; execution: Execution };
export type Moteur = (entree: Entree, reglage: Reglage) => Resultat;

// Générateur à graine (mulberry32) : entiers 32 bits uniquement, aucun Math.random.
const PAS = 0x6d2b79f5;
const VERIFIER = (g: number): void => {
  if (!Number.isInteger(g) || !Number.isSafeInteger(g)) throw new ErreurOrdres('graine_invalide');
};

function alea(graine: number): () => number {
  let etat = graine >>> 0;
  return () => {
    etat = (etat + PAS) >>> 0;
    let t = etat;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  };
}

/** Mélange de Fisher-Yates déterministe ; ne modifie pas le tableau reçu. */
export function melanger<T>(tableau: readonly T[], graine: number): T[] {
  VERIFIER(graine);
  const sortie = [...tableau];
  const tirer = alea(graine);
  for (let i = sortie.length - 1; i > 0; i--) {
    const j = tirer() % (i + 1);
    [sortie[i], sortie[j]] = [sortie[j] as T, sortie[i] as T];
  }
  return sortie;
}

const cle = (l: Lien): string => `${l.ligneId}|${l.pieceId ?? ''}|${l.montantAffecte}`;
const cmp = (x: string, y: string): number => (x < y ? -1 : x > y ? 1 : 0);
const trier = (a: string[]): string[] => a.sort(cmp);

function signatures(r: Resultat): Map<string, string> {
  const ids = new Set([...Object.keys(r.etats), ...r.liens.map((l) => l.ligneId)]);
  const sortie = new Map<string, string>();
  for (const id of ids) {
    const couples = trier(r.liens.filter((l) => l.ligneId === id).map(cle));
    sortie.set(id, `${r.etats[id] ?? ''}#${couples.join(';')}`);
  }
  return sortie;
}

export function rapprocherEnTroisOrdres(entree: Entree, reglage: Reglage, graines: Graines, moteur: Moteur = rapprocher): ResultatOrdres {
  graines.forEach(VERIFIER);
  const runs = graines.map((g) => moteur({ lignes: melanger(entree.lignes, g), pieces: melanger(entree.pieces, g) }, reglage));
  const sigs = runs.map(signatures);
  const douteuses = new Set<string>();
  for (const id of new Set(sigs.flatMap((s) => [...s.keys()]))) {
    if (new Set(sigs.map((s) => s.get(id))).size > 1) douteuses.add(id);
  }
  const base = runs[0] as Resultat;
  const etats = { ...base.etats };
  const options = { ...base.options };
  const liens: Lien[] = [];
  const dejaVu = new Set<string>();
  for (const l of runs.flatMap((r) => r.liens)) {
    if (!douteuses.has(l.ligneId)) {
      if (runs[0]?.liens.includes(l)) liens.push(l);
      continue;
    }
    if (dejaVu.has(cle(l))) continue;
    dejaVu.add(cle(l));
    liens.push({ ...l, score: Math.min(l.score, reglage.bareme.plafondAmbigu), codeRaison: CODE_DEPEND_ORDRE, etat: 'propose' });
  }
  for (const id of douteuses) {
    etats[id] = 'DOUTEUSE';
    options[id] = trier([...new Set(runs.flatMap((r) => r.liens.filter((l) => l.ligneId === id).map((l) => l.pieceId ?? '')).filter((p) => p !== ''))]);
  }
  liens.sort((a, b) => cmp(a.ligneId, b.ligneId) || cmp(a.pieceId ?? '', b.pieceId ?? ''));
  const notes = new Set(graines).size < graines.length ? ['graines_identiques'] : [];
  const empreinteResultat = sha256Hex(trier(liens.map(cle)).join('\n'));
  return { liens, etats, options, execution: { graines, empreinteResultat, ecartEntreOrdres: douteuses.size > 0, notes } };
}
