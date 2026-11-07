// CC-PM04 à CC-PM07 : enveloppes de règles autour des fonctions pures existantes.
// Aucune règle métier ici ; une exception de la fonction pure devient IMPOSSIBLE dans le moteur.
import type { Centimes } from '../../argent/index.js';
import { controlePartsCapital, liberationMinimale, type AssocieParts } from '../../capital/liberation.js';
import { relireExercice, type InstantaneCloture } from '../../conservation/relecture-exercice.js';
import {
  controleDividendeGerant,
  type EntreeControleGerant,
} from '../../dividendes/gerant-majoritaire.js';
import type { Ecriture } from '../../ecritures/modele.js';
import type { Blocage, Declencheur, RegleControle, SortieRegle } from '../moteur.js';
import { alerte, ok } from './commun.js';

const CLOTURE: Blocage[] = ['cloture'];
const CLOTURE_OU_DEMANDE: Declencheur[] = ['avant_cloture', 'a_la_demande'];

export interface ObjetPartsCapital {
  associes: readonly AssocieParts[];
  partsCapital: number;
}

export interface ObjetLiberation {
  apportsNumeraire: Centimes;
  verse: Centimes;
  /** Points de base, issu d'un paramètre daté : jamais dans la règle. */
  fractionMinPointsDeBase: number;
}

export interface ObjetDividendeGerant {
  entree: EntreeControleGerant;
  /** Points de base, issu d'un paramètre daté : jamais dans la règle. */
  seuilPointsDeBase: number;
}

export interface ObjetRelecture {
  ecritures: readonly Ecriture[];
  instantane: InstantaneCloture;
}

export const reglePartsCapital: RegleControle<ObjetPartsCapital> = {
  id: 'CC-PM04',
  version: 1,
  gravite: 'B',
  bloque: CLOTURE,
  declencheurs: CLOTURE_OU_DEMANDE,
  actif: true,
  evaluer: (o): SortieRegle => {
    const r = controlePartsCapital(o.associes, o.partsCapital);
    // L'écart est en parts, pas en centimes : il va dans `valeur`.
    return r.ok ? ok() : alerte(undefined, r.ecart);
  },
};

export const regleLiberation: RegleControle<ObjetLiberation> = {
  id: 'CC-PM05',
  version: 1,
  gravite: 'B',
  bloque: CLOTURE,
  declencheurs: CLOTURE_OU_DEMANDE,
  actif: true,
  evaluer: (o): SortieRegle => {
    const r = liberationMinimale(
      { apportsNumeraire: o.apportsNumeraire, verse: o.verse },
      o.fractionMinPointsDeBase,
    );
    return r.suffisante ? ok() : alerte(r.manque);
  },
};

export const regleDividendeGerant: RegleControle<ObjetDividendeGerant> = {
  id: 'CC-PM06',
  version: 1,
  gravite: 'B',
  bloque: CLOTURE,
  declencheurs: CLOTURE_OU_DEMANDE,
  actif: true,
  evaluer: (o): SortieRegle => {
    const r = controleDividendeGerant(o.entree, o.seuilPointsDeBase);
    if (r.statut === 'non_applicable') return { resultat: 'NON_APPLICABLE' };
    return r.statut === 'passe' ? ok() : alerte(r.excedent);
  },
};

export const regleRelectureExercice: RegleControle<ObjetRelecture> = {
  id: 'CC-PM07',
  version: 1,
  gravite: 'B',
  bloque: ['export', 'cloture'],
  declencheurs: ['avant_export', 'nocturne', 'a_la_demande'],
  actif: true,
  evaluer: (o): SortieRegle => {
    const r = relireExercice(o.ecritures, o.instantane);
    if (r.statut === 'intact') return ok();
    const ecart = r.ecartDebit !== 0 ? r.ecartDebit : r.ecartCredit;
    // Altération à totaux égaux : pas d'écart chiffré.
    return ecart !== 0 ? alerte(ecart) : alerte();
  },
};
