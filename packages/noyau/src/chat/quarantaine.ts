// Quarantaine de lecture : une valeur venue d'une pièce n'est jamais une consigne, une préférence
// ni un argument d'outil M ou I sans geste humain. Fonctions pures.
import type { Niveau, Origine } from './types.js';

export type Valeur<T> = { readonly valeur: T; readonly origine: Origine };

export function marquer<T>(valeur: T, origine: Origine): Valeur<T> {
  return { valeur, origine };
}

export type ResultatArguments =
  | { readonly permis: true }
  | { readonly permis: false; readonly code: 'parametre_invalide'; readonly champs: readonly string[] };

export function verifierArguments(
  niveau: Niveau,
  args: Readonly<Record<string, Valeur<unknown>>>,
  gesteHumain: boolean,
): ResultatArguments {
  if ((niveau !== 'M' && niveau !== 'I') || gesteHumain) return { permis: true };
  const champs = Object.keys(args).filter((c) => args[c]?.origine === 'piece');
  return champs.length === 0 ? { permis: true } : { permis: false, code: 'parametre_invalide', champs };
}

export type Preference = {
  readonly cle: string;
  readonly valeur: unknown;
  readonly personne: string;
  readonly source: 'dit_par_la_personne';
  readonly oubliee: boolean;
};
export type DemandePreference = {
  cle: string;
  valeur: unknown;
  origine: Origine;
  personne: string;
};
export type ResultatPreference =
  | { readonly ok: true; readonly preferences: readonly Preference[] }
  | { readonly ok: false; readonly code: 'origine_refusee' | 'cle_vide' | 'plafond_atteint' | 'max_invalide' };

const memeCle = (p: Preference, d: { cle: string; personne: string }): boolean =>
  p.cle === d.cle && p.personne === d.personne;

export function creerPreference(
  existantes: readonly Preference[],
  demande: DemandePreference,
  max: number,
): ResultatPreference {
  if (!Number.isSafeInteger(max) || max <= 0) return { ok: false, code: 'max_invalide' };
  if (demande.origine !== 'personne') return { ok: false, code: 'origine_refusee' };
  const cle = demande.cle.trim();
  if (cle === '' || demande.personne.trim() === '') return { ok: false, code: 'cle_vide' };
  const cible = { cle, personne: demande.personne };
  const autres = existantes.filter((p) => !memeCle(p, cible));
  const actives = autres.filter((p) => p.personne === demande.personne && !p.oubliee).length;
  if (actives >= max) return { ok: false, code: 'plafond_atteint' };
  const neuve: Preference = {
    cle, valeur: demande.valeur, personne: demande.personne, source: 'dit_par_la_personne', oubliee: false,
  };
  return { ok: true, preferences: [...autres, neuve] };
}

/** « Oublier » marque la préférence ; l'application n'efface rien. */
export function oublier(preferences: readonly Preference[], cle: string): readonly Preference[] {
  return preferences.map((p) => (p.cle === cle ? { ...p, oubliee: true } : p));
}

export function preferencesActives(preferences: readonly Preference[]): readonly Preference[] {
  return preferences.filter((p) => !p.oubliee);
}
