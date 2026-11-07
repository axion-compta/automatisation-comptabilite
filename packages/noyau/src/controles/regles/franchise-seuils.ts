// Contrôle CC-T12 : chiffre d'affaires d'une société en franchise face aux seuils lus en paramètre.
// Aucun seuil ni taux ici : tout arrive en argument. Aucun texte affiché : seulement des codes.
import { appliquerFraction, pourcentage } from '../../argent/index.js';
import type { Centimes } from '../../argent/index.js';
import type { Declencheur, RegleControle, SortieRegle } from '../moteur.js';
import { alerte, entierParametre, ErreurControle, exigerCentimes, ok, parametreUtilisable } from './commun.js';
import type { ParametreLu } from './commun.js';

export interface ObjetFranchise {
  caVentes: Centimes;
  caServices: Centimes;
  seuilVentes: ParametreLu;
  seuilServices: ParametreLu;
  majoreVentes: ParametreLu;
  majoreServices: ParametreLu;
  /** Réglage d'alerte en points de base du seuil (pas une valeur légale). */
  alertePdb: number;
  prorata?: { joursActivite: number; joursAnnee: number };
}

export type PositionFranchise = 'sous' | 'alerte' | 'depasse_majore' | 'a_verifier';

const PDB_PLEIN = 10 ** 4;
const RANG: Record<PositionFranchise, number> = { sous: 0, alerte: 1, a_verifier: 2, depasse_majore: 3 };

function exigerEntree(ok: boolean): void {
  if (!ok) throw new ErreurControle('entree_invalide');
}

/** Seuil ramené à la période d'activité (fraction entière, arrondi inférieur). */
export function seuilProrata(seuil: Centimes, prorata?: ObjetFranchise['prorata']): Centimes {
  if (prorata === undefined) return seuil;
  const { joursActivite: a, joursAnnee: n } = prorata;
  exigerEntree(Number.isSafeInteger(a) && Number.isSafeInteger(n) && a > 0 && n >= a);
  return appliquerFraction(seuil, a, n, 'inferieur');
}

function lireMontant(p: ParametreLu): Centimes {
  const n = entierParametre(p);
  exigerEntree(n >= 0);
  return exigerCentimes(n);
}

function positionNature(ca: Centimes, seuil: ParametreLu, majore: ParametreLu, o: ObjetFranchise): PositionFranchise {
  exigerEntree(Number.isSafeInteger(ca) && ca >= 0);
  if (!parametreUtilisable(seuil) || !parametreUtilisable(majore)) return 'a_verifier';
  const limiteMajoree = seuilProrata(lireMontant(majore), o.prorata);
  if (ca > limiteMajoree) return 'depasse_majore';
  const limiteAlerte = pourcentage(seuilProrata(lireMontant(seuil), o.prorata), o.alertePdb, 'superieur');
  return ca >= limiteAlerte ? 'alerte' : 'sous';
}

/** Le pire des deux natures ; un seuil non utilisable donne `a_verifier`, sauf dépassement certain de l'autre nature. */
export function positionFranchise(o: ObjetFranchise): PositionFranchise {
  exigerEntree(Number.isSafeInteger(o.alertePdb) && o.alertePdb >= 0 && o.alertePdb <= PDB_PLEIN);
  const positions = [
    positionNature(o.caVentes, o.seuilVentes, o.majoreVentes, o),
    positionNature(o.caServices, o.seuilServices, o.majoreServices, o),
  ];
  return positions.reduce((pire, p) => (RANG[p] > RANG[pire] ? p : pire));
}

const DECLENCHEURS: Declencheur[] = ['continu', 'nocturne', 'a_la_demande'];

export const regleCCT12: RegleControle<ObjetFranchise> = {
  id: 'CC-T12',
  version: 1,
  gravite: 'B',
  bloque: ['tva'],
  declencheurs: DECLENCHEURS,
  actif: true,
  evaluer: (o): SortieRegle => {
    const p = positionFranchise(o);
    if (p === 'a_verifier') return { resultat: 'IMPOSSIBLE' };
    return p === 'depasse_majore' ? alerte() : ok();
  },
};

export const regleCCT12M: RegleControle<ObjetFranchise> = {
  id: 'CC-T12M',
  version: 1,
  gravite: 'M',
  bloque: [],
  declencheurs: DECLENCHEURS,
  actif: true,
  evaluer: (o): SortieRegle => (positionFranchise(o) === 'alerte' ? alerte() : ok()),
};
