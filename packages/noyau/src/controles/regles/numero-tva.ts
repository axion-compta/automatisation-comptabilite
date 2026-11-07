// Contrôle CC-K09 : numéro de TVA intracommunautaire français (clé calculée, remplissage refusé).
// Algorithmes de contrôle seulement, aucune valeur légale datée. Codes seulement, aucun texte.
import type { RegleControle, SortieRegle } from '../moteur.js';
import { alerte, ok } from './commun.js';

export type StatutNumeroTva = 'cle_juste' | 'cle_fausse' | 'remplissage' | 'format_invalide' | 'hors_france';

// Constantes de l'algorithme de clé (modulo, décalage, multiplicateur) et de Luhn.
const MODULO_CLE = 97;
const DECALAGE_CLE = 12;
const FACTEUR_CLE = 3;
const BASE = 10;
const LONGUEUR_SIREN = 9;

/** SIREN : 9 chiffres, somme de Luhn multiple de la base. */
export function sirenValide(siren: string): boolean {
  if (!/^[0-9]{9}$/.test(siren)) return false;
  let somme = 0;
  for (let i = 0; i < LONGUEUR_SIREN; i++) {
    let chiffre = Number(siren[LONGUEUR_SIREN - 1 - i]);
    if (i % 2 === 1) {
      chiffre *= 2;
      if (chiffre >= BASE) chiffre -= BASE - 1;
    }
    somme += chiffre;
  }
  return somme % BASE === 0;
}

export function analyserNumeroTva(s: string): { statut: StatutNumeroTva } {
  const t = s.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}/.test(t)) return { statut: 'format_invalide' };
  if (!t.startsWith('FR')) return { statut: 'hors_france' };
  const m = /^FR([0-9A-Z]{2})([0-9]{9})$/.exec(t);
  if (m === null) return { statut: 'format_invalide' };
  const cle = m[1] as string;
  const siren = m[2] as string;
  if (/[A-Z]/.test(cle) || /^0+$/.test(siren) || !sirenValide(siren)) return { statut: 'remplissage' };
  const attendue = (DECALAGE_CLE + FACTEUR_CLE * (Number(siren) % MODULO_CLE)) % MODULO_CLE;
  return { statut: Number(cle) === attendue ? 'cle_juste' : 'cle_fausse' };
}

export const regleCCK09: RegleControle<string> = {
  id: 'CC-K09',
  version: 1,
  gravite: 'M',
  bloque: [],
  declencheurs: ['arrivee', 'a_la_demande'],
  actif: true,
  evaluer(numero): SortieRegle {
    const { statut } = analyserNumeroTva(numero);
    if (statut === 'cle_juste') return ok();
    if (statut === 'hors_france') return { resultat: 'NON_APPLICABLE' };
    return alerte(undefined, statut);
  },
};
