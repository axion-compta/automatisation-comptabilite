// Règle C4 : mode amorçage (premier import). Cas regroupés par cause, une décision par fournisseur.
// Aucun texte affiché ici : seulement des codes.

import { ErreurControle } from '../regles/commun.js';

export interface CasAmorcage {
  id: string;
  cause: string;
  fournisseurId: string;
}

export interface DecisionAmorcage {
  cause: string;
  fournisseurId: string;
  casIds: string[];
}

export interface EtatAmorcage {
  readonly cas: readonly CasAmorcage[];
  readonly decidees: readonly string[];
  readonly decisions: number;
}

function comparer(a: string, b: string): number {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

export function planDecisions(cas: readonly CasAmorcage[]): { decisions: DecisionAmorcage[] } {
  const ids = new Set<string>();
  const groupes = new Map<string, DecisionAmorcage>();
  for (const c of cas) {
    if (ids.has(c.id)) throw new ErreurControle('entree_invalide');
    ids.add(c.id);
    const cle = JSON.stringify([c.cause, c.fournisseurId]);
    const g = groupes.get(cle) ?? { cause: c.cause, fournisseurId: c.fournisseurId, casIds: [] };
    g.casIds.push(c.id);
    groupes.set(cle, g);
  }
  const decisions = [...groupes.values()];
  for (const d of decisions) d.casIds.sort(comparer);
  decisions.sort(
    (a, b) =>
      b.casIds.length - a.casIds.length ||
      comparer(a.cause, b.cause) ||
      comparer(a.fournisseurId, b.fournisseurId),
  );
  return { decisions };
}

export function etatInitial(cas: readonly CasAmorcage[]): EtatAmorcage {
  planDecisions(cas);
  return { cas: [...cas], decidees: [], decisions: 0 };
}

/** Une décision ne vise que des cas connus et pas encore décidés ; sinon exception codée. */
export function appliquerDecision(etat: EtatAmorcage, decision: DecisionAmorcage): EtatAmorcage {
  if (decision.casIds.length === 0) throw new ErreurControle('entree_invalide');
  const connus = new Map(etat.cas.map((c) => [c.id, c]));
  const deja = new Set(etat.decidees);
  const vus = new Set<string>();
  for (const id of decision.casIds) {
    const c = connus.get(id);
    if (c === undefined || deja.has(id) || vus.has(id)) throw new ErreurControle('entree_invalide');
    if (c.cause !== decision.cause || c.fournisseurId !== decision.fournisseurId) {
      throw new ErreurControle('entree_invalide');
    }
    vus.add(id);
  }
  return { cas: etat.cas, decidees: [...etat.decidees, ...decision.casIds], decisions: etat.decisions + 1 };
}

export function rapportReprise(etat: EtatAmorcage): { cas: number; decisions: number; restants: number } {
  return { cas: etat.cas.length, decisions: etat.decisions, restants: etat.cas.length - etat.decidees.length };
}
