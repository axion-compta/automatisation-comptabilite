// Les dates d'un exercice restent modifiables tant qu'aucune écriture n'est validée.
import type { Exercice } from './exercices.js';

export type ResultatDatesModifiables = { ok: true } | { refus: 'ecriture_deja_validee' };

/** Même phrase que dans textes/moteur/exercices.ts (12 mots au plus). */
export const PHRASE_DATES_MODIFIABLES = "Vous pouvez changer ces dates tant qu'aucune écriture n'est validée.";

/** Du 1er janvier au 31 décembre de l'année donnée. */
export function datesParDefaut(annee: number): { debut: string; fin: string } {
  if (!Number.isInteger(annee) || annee < 1000 || annee > 9999) throw new Error('Année invalide : ' + String(annee));
  return { debut: `${annee}-01-01`, fin: `${annee}-12-31` };
}

/** Compteur invalide (négatif, NaN, non entier) : refus par prudence. */
export function datesModifiables(_exercice: Exercice, nbEcrituresValidees: number): ResultatDatesModifiables {
  if (!Number.isInteger(nbEcrituresValidees) || nbEcrituresValidees !== 0) return { refus: 'ecriture_deja_validee' };
  return { ok: true };
}
