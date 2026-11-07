// Contrôle CC-K12 : nature douteuse. Comptes, préfixes et seuil arrivent en argument.
// Aucun texte affiché : seulement des codes.
import type { Centimes } from '../../argent/index.js';
import type { Declencheur, RegleControle, SortieRegle } from '../moteur.js';
import { alerte, ErreurControle, exigerCentimes, ok } from './commun.js';
import type { LignePiece } from './commun.js';

export interface ObjetNature {
  ligne: LignePiece;
  comptepropose: string;
  natureDurable: boolean;
  natureCaution: boolean;
  seuilImmobilisation?: Centimes;
  comptesDepot: readonly string[];
  prefixesCharge: readonly string[];
  prefixesImmobilisation: readonly string[];
  naturesHorsActivite: readonly string[];
  natureHabituelle?: string;
}

export type MotifNature = 'immobilisation_probable' | 'immobilisation_sur_charge' | 'caution_en_charge' | 'hors_activite';

const commencePar = (compte: string, prefixes: readonly string[]): boolean => prefixes.some((p) => compte.startsWith(p));

function exigerPositif(n: number): number {
  if (exigerCentimes(n) < 0) throw new ErreurControle('entree_invalide');
  return n;
}

export function motifsNature(o: ObjetNature): MotifNature[] {
  const ht = exigerPositif(o.ligne.ht);
  const motifs: MotifNature[] = [];
  const surCharge = commencePar(o.comptepropose, o.prefixesCharge);
  if (o.natureDurable && surCharge) {
    if (o.seuilImmobilisation === undefined) throw new ErreurControle('parametre_absent');
    if (ht >= exigerPositif(o.seuilImmobilisation)) motifs.push('immobilisation_probable');
  }
  if (!o.natureDurable && commencePar(o.comptepropose, o.prefixesImmobilisation)) motifs.push('immobilisation_sur_charge');
  if (o.natureCaution && !o.comptesDepot.includes(o.comptepropose)) motifs.push('caution_en_charge');
  if (o.naturesHorsActivite.includes(o.ligne.nature)) motifs.push('hors_activite');
  return motifs.sort();
}

const DECLENCHEURS: Declencheur[] = ['arrivee', 'continu', 'a_la_demande'];

export const regleCCK12: RegleControle<ObjetNature> = {
  id: 'CC-K12',
  version: 1,
  gravite: 'M',
  bloque: [],
  declencheurs: DECLENCHEURS,
  actif: true,
  evaluer: (o): SortieRegle => {
    const motifs = motifsNature(o);
    return motifs.length === 0 ? ok() : alerte(undefined, motifs.join('|'));
  },
};

export const regleCCK12H: RegleControle<ObjetNature> = {
  id: 'CC-K12H',
  version: 1,
  gravite: 'm',
  bloque: [],
  declencheurs: DECLENCHEURS,
  actif: true,
  evaluer: (o): SortieRegle =>
    o.natureHabituelle !== undefined && o.natureHabituelle !== o.ligne.nature ? alerte(undefined, o.ligne.nature) : ok(),
};
