import { genererProfils } from '../../../donnees-fictives/src/profil.js';
import type { LigneImposition, LigneRegimeTva } from './regimes.js';

export type OptionsRegimes = { tvaSupplementaires?: LigneRegimeTva[]; impositionSupplementaires?: LigneImposition[] };

/** Plus récent d'abord ; à effet égal, la ligne sans fin (en cours) passe avant. */
const parEffetDecroissant = <T extends { effetDebut: string; effetFin: string | null }>(a: T, b: T) =>
  b.effetDebut.localeCompare(a.effetDebut) || Number(a.effetFin !== null) - Number(b.effetFin !== null);

/** Lecture fictive des régimes d'une société, bâtie sur genererProfils (le noyau L03-T20 fait foi). */
export function creerServiceRegimes(societeId: string, options: OptionsRegimes = {}) {
  const jeu = genererProfils();
  const statutTva = jeu.champs.find((c) => c.societeId === societeId && c.cle === 'regime_tva')?.statut;
  const tva: LigneRegimeTva[] = jeu.regimesTva
    .filter((r) => r.societeId === societeId)
    .map((r) => ({
      regime: r.regime,
      periodicite: 'trimestrielle',
      exigibiliteServices: 'encaissements',
      optionDebits: false,
      effetDebut: r.effet_debut,
      effetFin: r.effet_fin,
      motif: 'creation' as const,
      statut: statutTva === 'a_confirmer' ? ('propose' as const) : ('confirme' as const),
    }));
  const imposition: LigneImposition[] = jeu.regimesImposition
    .filter((r) => r.societeId === societeId)
    .map((r) => ({ impot: r.impot, categorie: r.categorie, regime: r.regime, tauxReduit: 'a_confirmer' as const, effetDebut: r.effet_debut, effetFin: null, motif: 'creation' as const, statut: 'confirme' as const }));
  return {
    listerTva: (): LigneRegimeTva[] => [...tva, ...(options.tvaSupplementaires ?? [])].sort(parEffetDecroissant),
    listerImposition: (): LigneImposition[] => [...imposition, ...(options.impositionSupplementaires ?? [])].sort(parEffetDecroissant),
  };
}
