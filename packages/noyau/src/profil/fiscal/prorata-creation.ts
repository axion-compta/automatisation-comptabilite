import type { Centimes } from '../../argent/index.js';
import { ajouterJours, ErreurProfil, joursInclus, type Confiance } from '../types.js';

export type RegleProrata = { joursAnnee: number; finIncluse: boolean };
export type ComparaisonProrata = 'sous' | 'egal' | 'au_dessus';
export type NiveauFranchiseCreation = 'sous_base' | 'entre_base_et_majore' | 'au_dessus_majore';
export type PeriodeCreation = { debutActivite: string; finAnnee: string };
export type EtatFranchiseCreation = {
  niveau: NiveauFranchiseCreation;
  aVerifier: boolean;
  caAnnualiseAffiche: null;
  sortieProposeeLe: string | null;
};

const entier = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n);

/** Lit la règle de décompte dans la valeur (JSON) du paramètre ; validation stricte. */
export function lireRegle(valeur: unknown): RegleProrata {
  const v = valeur as Record<string, unknown> | null;
  if (typeof v !== 'object' || v === null || !entier(v.joursAnnee) || v.joursAnnee <= 0 || typeof v.finIncluse !== 'boolean') {
    throw new ErreurProfil('regle_prorata_invalide');
  }
  return { joursAnnee: v.joursAnnee, finIncluse: v.finIncluse };
}

function nombreDeJours(p: PeriodeCreation, regle: RegleProrata): number {
  const inclus = joursInclus(p.debutActivite, p.finAnnee, regle.joursAnnee);
  const jours = regle.finIncluse ? inclus : inclus - 1;
  if (jours < 1) throw new ErreurProfil('aucun_jour');
  return jours;
}

/** Compare CA × jours de l'année au seuil × jours d'activité, en BigInt, sans division. */
export function comparerAuProrata(
  caCentimes: Centimes,
  periode: PeriodeCreation,
  regle: RegleProrata,
  seuilCentimes: Centimes,
): ComparaisonProrata {
  const r = lireRegle(regle);
  if (!entier(caCentimes) || caCentimes < 0 || !entier(seuilCentimes) || seuilCentimes <= 0) {
    throw new ErreurProfil('entree_invalide');
  }
  const jours = nombreDeJours(periode, r);
  const gauche = BigInt(caCentimes) * BigInt(r.joursAnnee);
  const droite = BigInt(seuilCentimes) * BigInt(jours);
  if (gauche === droite) return 'egal';
  return gauche > droite ? 'au_dessus' : 'sous';
}

export function etatFranchiseCreation(
  caCentimes: Centimes,
  periode: PeriodeCreation,
  regle: RegleProrata,
  p: { seuilBase: Centimes; seuilMajore: Centimes; statutParametre: Confiance },
): EtatFranchiseCreation {
  if (entier(p.seuilBase) && entier(p.seuilMajore) && p.seuilMajore < p.seuilBase) {
    throw new ErreurProfil('seuils_inverses');
  }
  const aVerifier = p.statutParametre !== 'sur';
  const base: Omit<EtatFranchiseCreation, 'niveau' | 'sortieProposeeLe'> = { aVerifier, caAnnualiseAffiche: null };
  if (comparerAuProrata(caCentimes, periode, regle, p.seuilMajore) === 'au_dessus') {
    return { ...base, niveau: 'au_dessus_majore', sortieProposeeLe: null };
  }
  if (comparerAuProrata(caCentimes, periode, regle, p.seuilBase) === 'au_dessus') {
    return { ...base, niveau: 'entre_base_et_majore', sortieProposeeLe: ajouterJours(periode.finAnnee, 1) };
  }
  return { ...base, niveau: 'sous_base', sortieProposeeLe: null };
}
