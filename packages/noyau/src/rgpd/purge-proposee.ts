import {
  conserverJusquAu, estCategorieComptable, purgePossible, type CategorieConservation, type Gel, type PointDepart, type RegleConservation,
} from '../conservation/regles.js';
import { ErreurRgpd } from './types.js';

export type LignePurge = { id: string; categorie: CategorieConservation; pays: string[]; dates: Partial<Record<PointDepart, string>> };
export type RaisonGarde = 'gel_actif' | 'a_confirmer' | 'trop_tot' | 'conservation_comptable';
export type ResultatPurge = { proposees: string[]; gardees: { id: string; raison: RaisonGarde }[] };

const comparer = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

// Propose seulement : l'effacement réel passe par l'action de la console.
export function proposerPurge(
  lignes: readonly LignePurge[], regles: readonly RegleConservation[], contexte: { gels: readonly Gel[]; aujourdhui: string; origine?: 'console' },
): ResultatPurge {
  const vus = new Set<string>();
  const proposees: string[] = [];
  const gardees: ResultatPurge['gardees'] = [];
  for (const l of lignes) {
    if (vus.has(l.id)) throw new ErreurRgpd('doublon');
    vus.add(l.id);
    const verdict = purgePossible(conserverJusquAu(regles, l), contexte);
    if (verdict.ok) proposees.push(l.id);
    else {
      // Console : une ligne comptable encore en conservation est gardée, sans effet sur les données comptables (un gel garde son code).
      const comptable = contexte.origine === 'console' && estCategorieComptable(l.categorie) && verdict.code !== 'gel_actif';
      gardees.push({ id: l.id, raison: comptable ? 'conservation_comptable' : verdict.code });
    }
  }
  return { proposees: proposees.sort(comparer), gardees: gardees.sort((a, b) => comparer(a.id, b.id)) };
}

export function resumePurge(r: ResultatPurge): Record<'proposees' | RaisonGarde, number> {
  const n = (raison: RaisonGarde): number => r.gardees.filter((g) => g.raison === raison).length;
  return {
    proposees: r.proposees.length, gel_actif: n('gel_actif'), a_confirmer: n('a_confirmer'), trop_tot: n('trop_tot'),
    conservation_comptable: n('conservation_comptable'),
  };
}
