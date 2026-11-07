// Indicateurs à vide : jamais 0 quand la donnée manque. Codes seulement, aucune phrase.
import { proportionPointsDeBase } from '../argent/index.js';

export type Indicateur =
  | { readonly etat: 'ok'; readonly valeur: number }
  | { readonly etat: 'vide'; readonly valeur: null; readonly raison: 'aucune_donnee' }
  | {
      readonly etat: 'donnee_manquante';
      readonly valeur: null;
      readonly raison: 'donnee_absente' | 'pas_de_point_de_comparaison';
    };

export class ErreurIndicateur extends Error {
  override name = 'ErreurIndicateur';
  readonly code = 'siren_absent';
}

const fini = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const manquant: Indicateur = { etat: 'donnee_manquante', valeur: null, raison: 'donnee_absente' };
const sansPoint: Indicateur = { etat: 'donnee_manquante', valeur: null, raison: 'pas_de_point_de_comparaison' };

export function indicateurDepuis(e: { readonly nbElements: number; readonly valeur: number | null | undefined }): Indicateur {
  if (e.nbElements === 0) return { etat: 'vide', valeur: null, raison: 'aucune_donnee' };
  if (!fini(e.valeur)) return manquant;
  return { etat: 'ok', valeur: e.valeur };
}

/** Calcul sur la valeur absolue puis signe remis (arrondi vers zéro, mode `inferieur`) ; jamais de -0. */
export function croissancePointsDeBase(actuel: number | null | undefined, precedent: number | null | undefined): Indicateur {
  if (!fini(precedent) || precedent <= 0) return sansPoint;
  if (!fini(actuel)) return manquant;
  const ecart = actuel - precedent;
  const p = proportionPointsDeBase(Math.abs(ecart), precedent, 'inferieur');
  if (p === null || p === 0) return { etat: 'ok', valeur: 0 };
  return { etat: 'ok', valeur: ecart < 0 ? -p : p };
}

export function disponibilite(
  fonction: 'declaration' | 'fec_officiel' | 'autre',
  societe: { readonly statut: 'en_formation' | 'immatriculee'; readonly siren?: string | undefined },
): 'disponible' | 'apres_immatriculation' {
  if (societe.statut === 'immatriculee' && (societe.siren === undefined || societe.siren.trim() === '')) {
    throw new ErreurIndicateur('SIREN absent pour une société immatriculée.');
  }
  if (fonction === 'autre') return 'disponible';
  return societe.statut === 'en_formation' ? 'apres_immatriculation' : 'disponible';
}
