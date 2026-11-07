import { CONFIANCES, ErreurProfil, ORIGINES, STATUTS_CHAMP, estDans, exigerDate } from './types.js';
import type { ChampProfil, Confiance, Origine, StatutChamp } from './types.js';

export type NouvelleValeur = {
  societeId: string;
  cle: string;
  valeur: unknown;
  origine: Origine;
  confiance: Confiance;
  sourceRef?: string | null;
  dateSource?: string | null;
  statut?: StatutChamp;
  effetDebut?: string;
};
export type RefChamp = { societeId: string; cle: string; effetDebut: string };
export type Confirmant = { type: 'personne' | 'agent'; id: string };

const vide = (t: unknown): boolean => typeof t !== 'string' || t.trim() === '';
const memeCouple = (c: ChampProfil, societeId: string, cle: string): boolean => c.societeId === societeId && c.cle === cle;

function rangSuivant(historique: readonly ChampProfil[], societeId: string, cle: string): number {
  let max = 0;
  for (const c of historique) if (memeCouple(c, societeId, cle) && c.rang > max) max = c.rang;
  return max + 1;
}

function plusRecent(lignes: readonly ChampProfil[]): ChampProfil | null {
  let meilleur: ChampProfil | null = null;
  for (const c of lignes) {
    exigerDate(c.effetDebut, 'effetDebut');
    if (meilleur === null || c.effetDebut > meilleur.effetDebut || (c.effetDebut === meilleur.effetDebut && c.rang > meilleur.rang)) meilleur = c;
  }
  return meilleur;
}

export function ajouterValeur(historique: readonly ChampProfil[], nouvelle: NouvelleValeur, dateSaisie: string): readonly ChampProfil[] {
  if (vide(nouvelle.cle)) throw new ErreurProfil('cle_vide');
  if (!estDans(ORIGINES, nouvelle.origine)) throw new ErreurProfil('origine_inconnue');
  if (!estDans(CONFIANCES, nouvelle.confiance)) throw new ErreurProfil('confiance_inconnue');
  const statut = nouvelle.statut ?? 'a_confirmer';
  if (!estDans(STATUTS_CHAMP, statut)) throw new ErreurProfil('statut_inconnu');
  if (statut === 'confirme') throw new ErreurProfil('confirmation_par_agent');
  const saisie = exigerDate(dateSaisie, 'dateSaisie');
  const effetDebut = nouvelle.effetDebut === undefined ? saisie : exigerDate(nouvelle.effetDebut, 'effetDebut');
  const dateSource = nouvelle.dateSource === undefined || nouvelle.dateSource === null ? null : exigerDate(nouvelle.dateSource, 'dateSource');
  const ligne: ChampProfil = {
    societeId: nouvelle.societeId,
    cle: nouvelle.cle,
    valeur: nouvelle.valeur,
    origine: nouvelle.origine,
    confiance: nouvelle.confiance,
    sourceRef: nouvelle.sourceRef ?? null,
    dateSource,
    statut,
    effetDebut,
    confirmePar: null,
    confirmeLe: null,
    rang: rangSuivant(historique, nouvelle.societeId, nouvelle.cle),
  };
  return [...historique, ligne];
}

export function valeurEnVigueur(historique: readonly ChampProfil[], societeId: string, cle: string, date: string): ChampProfil | null {
  exigerDate(date, 'date');
  return plusRecent(historique.filter((c) => memeCouple(c, societeId, cle) && (exigerDate(c.effetDebut, 'effetDebut') <= date)));
}

export function confirmer(
  historique: readonly ChampProfil[],
  ref: RefChamp,
  confirmant: Confirmant,
  horodatage: string,
): readonly ChampProfil[] {
  if (confirmant.type !== 'personne') throw new ErreurProfil('confirmation_par_agent');
  if (vide(confirmant.id)) throw new ErreurProfil('confirmant_vide');
  if (vide(horodatage)) throw new ErreurProfil('horodatage_vide');
  exigerDate(ref.effetDebut, 'effetDebut');
  const cible = plusRecent(historique.filter((c) => memeCouple(c, ref.societeId, ref.cle) && c.effetDebut === ref.effetDebut));
  if (cible === null || cible.statut === 'je_ne_sais_pas' || cible.statut === 'vide') throw new ErreurProfil('rien_a_confirmer');
  const ligne: ChampProfil = {
    ...cible,
    statut: 'confirme',
    confirmePar: confirmant.id,
    confirmeLe: horodatage,
    rang: rangSuivant(historique, ref.societeId, ref.cle),
  };
  return [...historique, ligne];
}

export function marquerJeNeSaisPas(
  historique: readonly ChampProfil[],
  ref: { societeId: string; cle: string; effetDebut?: string },
  dateSaisie: string,
): readonly ChampProfil[] {
  const base: NouvelleValeur = { societeId: ref.societeId, cle: ref.cle, valeur: null, origine: 'saisie_personne', confiance: 'a_verifier', statut: 'je_ne_sais_pas' };
  return ajouterValeur(historique, ref.effetDebut === undefined ? base : { ...base, effetDebut: ref.effetDebut }, dateSaisie);
}
