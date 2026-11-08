import { genererDeclarations, type JeuDeclarations } from '../../../donnees-fictives/src/declarations.js';
import type { Echeance, ReponseEcheances } from './echeances.js';

export class ErreurEcheances extends Error {
  readonly code = 'ordre_inverse';
  constructor() {
    super('ordre_inverse');
    this.name = 'ErreurEcheances';
  }
}

const STATUT = { a_venir: 'a_venir', passee: 'en_retard' } as const;
const NIVEAU = { info: 'rappel_seul', attention: 'alerte' } as const;
const comparer = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Service pur en mémoire, bâti sur `genererDeclarations()` (L03-T31). Lecture seulement, aucun calcul d'échéance. */
export function creerServiceEcheances(jeu: JeuDeclarations = genererDeclarations()) {
  const toutes: Echeance[] = jeu.echeances
    .map((e) => ({ code: e.code, dateLimite: e.dateLimite, statut: STATUT[e.statut], dateAVerifier: e.dateAVerifier, niveau: NIVEAU[e.niveau] }))
    .sort((a, b) => comparer(a.dateLimite, b.dateLimite) || comparer(a.code, b.code));
  return {
    /** Bornes incluses, tri par date puis code. Les dates `AAAA-MM-JJ` se comparent comme des chaînes. */
    lister(du: string, au: string): ReponseEcheances {
      if (au < du) throw new ErreurEcheances();
      const body = toutes.filter((e) => e.dateLimite >= du && e.dateLimite <= au).map((e) => ({ ...e }));
      return { body, total: body.length };
    },
  };
}
