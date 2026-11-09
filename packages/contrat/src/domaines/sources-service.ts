import { genererSources, type JeuSources } from '../../../donnees-fictives/src/sources.js';
import type { EtatSources } from './sources.js';

/** Service en mémoire pur, bâti sur genererSources : connecteurs triés par nom. Lecture seule. */
export function creerServiceSources(jeu: JeuSources = genererSources()) {
  return {
    lire: (): EtatSources => ({
      veille: { ...jeu.veille },
      connecteurs: jeu.connecteurs.map((c) => ({ ...c })).sort((a, b) => (a.connecteur < b.connecteur ? -1 : a.connecteur > b.connecteur ? 1 : 0)),
    }),
  };
}
