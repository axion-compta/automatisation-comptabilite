// Contexte du chat recalculé côté serveur : une conversation = une société.
import { ErreurChat } from './types.js';

export type MotifRejet = 'autre_societe' | 'inconnue' | 'retiree';
export interface Puce {
  readonly ref: string;
  readonly retiree?: boolean;
}
export interface Rejet {
  readonly ref: string;
  readonly motif: MotifRejet;
}
export interface EntreeContexte {
  readonly puces: readonly Puce[];
  readonly societeSession: string;
  readonly societeConversation: string;
  readonly appartenance: (ref: string) => string | undefined;
}
export interface EvenementJournal {
  readonly code: 'chat.contexte_rejete';
  readonly ref: string;
  readonly motif: MotifRejet;
}

export function recalculerContexte(e: EntreeContexte): { gardees: string[]; rejets: Rejet[] } {
  if (e.societeSession === '' || e.societeConversation !== e.societeSession) {
    throw new ErreurChat('droit_insuffisant');
  }
  const retirees = new Set(e.puces.filter((p) => p.retiree === true).map((p) => p.ref));
  const vues = new Set<string>();
  const gardees: string[] = [];
  const rejets: Rejet[] = [];
  for (const { ref } of e.puces) {
    if (vues.has(ref)) continue;
    vues.add(ref);
    const societe = ref === '' ? undefined : e.appartenance(ref);
    if (societe === undefined) rejets.push({ ref, motif: 'inconnue' });
    else if (societe !== e.societeSession) rejets.push({ ref, motif: 'autre_societe' });
    else if (retirees.has(ref)) rejets.push({ ref, motif: 'retiree' });
    else gardees.push(ref);
  }
  return { gardees, rejets };
}

export function evenementsJournal(rejets: readonly Rejet[]): EvenementJournal[] {
  return rejets.map((r) => ({ code: 'chat.contexte_rejete', ref: r.ref, motif: r.motif }));
}
