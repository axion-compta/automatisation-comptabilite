// Catalogue des règles du FEC : concaténation des règles de structure, d'équilibre, de cohérence et d'identité.
import { REGLES_COHERENCE } from './controles-coherence.js';
import { REGLES_EQUILIBRE } from './controles-equilibre.js';
import { type RegleFec, REGLES_STRUCTURE } from './controles-structure.js';
import { REGLES_IDENTITE } from './identite.js';

const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export const REGLES_FEC: readonly RegleFec[] = [...REGLES_STRUCTURE, ...REGLES_EQUILIBRE, ...REGLES_COHERENCE, ...REGLES_IDENTITE].sort((a, b) =>
  cmp(a.id, b.id),
);

export const nombreReglesFec = (): number => REGLES_FEC.length;
