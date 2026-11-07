// Contrôles CC-T17 à CC-T19 : cession, acompte, créance irrécouvrable. Détection seulement :
// aucune écriture produite. Tant que le paramètre n'est pas valide, la préparation de la TVA est bloquée.
// Aucun texte affiché : seulement des codes.
import type { Centimes } from '../../argent/index.js';
import type { Declencheur, RegleControle, SortieRegle } from '../moteur.js';
import { alerte, ErreurControle, exigerCentimes, ok, parametreUtilisable } from './commun.js';
import type { ParametreLu } from './commun.js';

export type Evenement =
  | { type: 'cession'; prix: Centimes; immeuble: boolean }
  | { type: 'acompte'; sens: 'recu' | 'verse' | 'facture_acompte' }
  | { type: 'creance_perte'; tvaCollectee: Centimes };

export interface ObjetCasParticulier {
  evenement: Evenement;
  parametre: ParametreLu;
}

const NON_APPLICABLE: SortieRegle = { resultat: 'NON_APPLICABLE' };
const DECLENCHEURS: Declencheur[] = ['arrivee', 'continu', 'avant_tva', 'a_la_demande'];

function montantPositifOuNul(n: number): number {
  if (exigerCentimes(n) < 0) throw new ErreurControle('entree_invalide');
  return n;
}

const bloqueSi = (bloquant: boolean, o: ObjetCasParticulier): SortieRegle => (bloquant ? alerte(undefined, o.parametre.cle) : ok());

export const regleCCT17: RegleControle<ObjetCasParticulier> = {
  id: 'CC-T17',
  version: 1,
  gravite: 'B',
  bloque: ['tva'],
  declencheurs: DECLENCHEURS,
  actif: true,
  evaluer: ({ evenement, parametre }): SortieRegle => {
    if (evenement.type !== 'cession') return NON_APPLICABLE;
    const prix = montantPositifOuNul(evenement.prix);
    if (evenement.immeuble) return alerte(undefined, parametre.cle);
    if (prix === 0) return NON_APPLICABLE;
    return bloqueSi(!parametreUtilisable(parametre), { evenement, parametre });
  },
};

export const regleCCT18: RegleControle<ObjetCasParticulier> = {
  id: 'CC-T18',
  version: 1,
  gravite: 'B',
  bloque: ['tva'],
  declencheurs: DECLENCHEURS,
  actif: true,
  evaluer: (o): SortieRegle =>
    o.evenement.type !== 'acompte' ? NON_APPLICABLE : bloqueSi(!parametreUtilisable(o.parametre), o),
};

/** Paramètre valide : l'acompte reste à traiter par une personne. */
export const regleCCT18M: RegleControle<ObjetCasParticulier> = {
  id: 'CC-T18M',
  version: 1,
  gravite: 'M',
  bloque: [],
  declencheurs: DECLENCHEURS,
  actif: true,
  evaluer: (o): SortieRegle =>
    o.evenement.type !== 'acompte' ? NON_APPLICABLE : bloqueSi(parametreUtilisable(o.parametre), o),
};

export const regleCCT19: RegleControle<ObjetCasParticulier> = {
  id: 'CC-T19',
  version: 1,
  gravite: 'B',
  bloque: ['tva'],
  declencheurs: DECLENCHEURS,
  actif: true,
  evaluer: (o): SortieRegle => {
    if (o.evenement.type !== 'creance_perte') return NON_APPLICABLE;
    if (montantPositifOuNul(o.evenement.tvaCollectee) === 0) return NON_APPLICABLE;
    return bloqueSi(!parametreUtilisable(o.parametre), o);
  },
};
