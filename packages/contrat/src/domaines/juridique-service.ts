import { genererJuridique } from '../../../donnees-fictives/src/juridique.js';
import type { ObligationsJuridiques } from './juridique.js';

/** Service en mémoire pur pour UNE société (SIREN fictif), bâti sur genererJuridique. Lecture seule. */
export function creerServiceJuridique(societeSiren: string) {
  const lignes = genererJuridique().obligations.filter((o) => o.societeSiren === societeSiren);
  return {
    lire: (exercice: string): ObligationsJuridiques | null => lignes.find((o) => o.exerciceId === exercice) ?? null,
  };
}
