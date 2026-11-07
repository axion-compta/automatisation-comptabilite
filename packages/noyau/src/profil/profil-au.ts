import { valeurEnVigueur } from './champs.js';
import { impositionAuJour } from './fiscal/imposition.js';
import type { LigneImposition } from './fiscal/imposition.js';
import { exigerDate } from './types.js';
import type { ChampProfil, Confiance, Origine, StatutChamp } from './types.js';

export type ChampAu = { valeur: unknown; statut: StatutChamp; origine: Origine; confiance: Confiance; effetDebut: string };
export type ProfilAu = { date: string; champs: Readonly<Record<string, ChampAu>>; imposition: LigneImposition | null };

export function profilAu(
  entrees: { champs: readonly ChampProfil[]; imposition: readonly LigneImposition[] },
  societeId: string,
  date: string,
): ProfilAu {
  exigerDate(date, 'date');
  const cles = [...new Set(entrees.champs.filter((c) => c.societeId === societeId).map((c) => c.cle))].sort();
  const champs: Record<string, ChampAu> = {};
  for (const cle of cles) {
    const c = valeurEnVigueur(entrees.champs, societeId, cle, date);
    if (c === null) continue;
    champs[cle] = Object.freeze({ valeur: c.valeur, statut: c.statut, origine: c.origine, confiance: c.confiance, effetDebut: c.effetDebut });
  }
  const ligne = impositionAuJour(entrees.imposition, societeId, date);
  return Object.freeze({ date, champs: Object.freeze(champs), imposition: ligne === null ? null : Object.freeze({ ...ligne }) });
}
