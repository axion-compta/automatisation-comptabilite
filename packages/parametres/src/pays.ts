// Pays fiscal de la société et fournisseurs : tout vient du paquet daté (cle pays_ue), aucun code pays ici.
import { regleAuJour, type PaquetParametres, type UtilisationParametre } from './paquet.js';

export type CodeErreurPays = 'liste_pays_invalide';
export class ErreurPays extends Error {
  readonly code: CodeErreurPays;
  constructor(code: CodeErreurPays, detail = '') {
    super(detail === '' ? code : `${code} : ${detail}`);
    this.name = 'ErreurPays';
    this.code = code;
  }
}

const CLE_LISTE = 'pays_ue';
const PAYS_LISTE = 'UE';
const CODE_PAYS = /^[A-Z]{2}$/;

function lireListe(paquet: PaquetParametres, date: string): { pays: readonly string[]; aVerifier: boolean } {
  const r = regleAuJour(paquet, CLE_LISTE, PAYS_LISTE, date);
  const pays = r.ligne.valeur === '' ? [] : r.ligne.valeur.split(',');
  if (pays.some((p) => !CODE_PAYS.test(p)) || new Set(pays).size !== pays.length)
    throw new ErreurPays('liste_pays_invalide', r.parametreId);
  return { pays, aVerifier: r.aVerifier };
}

/** Pays de l'Union au jour D, tels que lus dans le paquet. */
export function paysDeLUnion(paquet: PaquetParametres, date: string): readonly string[] {
  return lireListe(paquet, date).pays;
}

export type ResultatPaysSociete = { ok: true; aVerifier: boolean } | { ok: false; code: 'pays_hors_union' };
/** Comparaison exacte : pas de normalisation de la casse ni des espaces. */
export function verifierPaysSociete(pays: string, paquet: PaquetParametres, date: string): ResultatPaysSociete {
  const l = lireListe(paquet, date);
  return l.pays.includes(pays) ? { ok: true, aVerifier: l.aVerifier } : { ok: false, code: 'pays_hors_union' };
}

export function statutFournisseur(pays: string, paquet: PaquetParametres, date: string): 'union' | 'hors_union_a_verifier' {
  return paysDeLUnion(paquet, date).includes(pays) ? 'union' : 'hors_union_a_verifier';
}

export interface EcriturePourUtilisation {
  id: string;
  appliqueRegleLegale: boolean;
  versionPaquet: string | null;
}
export type ResultatUtilisations =
  | { ok: true }
  | { ok: false; code: 'version_paquet_absente' | 'utilisation_parametre_absente' };
export function verifierUtilisations(
  ecriture: EcriturePourUtilisation,
  utilisations: readonly UtilisationParametre[],
): ResultatUtilisations {
  if (!ecriture.appliqueRegleLegale) return { ok: true };
  if (ecriture.versionPaquet === null || ecriture.versionPaquet === '') return { ok: false, code: 'version_paquet_absente' };
  if (!utilisations.some((u) => u.ecritureId === ecriture.id)) return { ok: false, code: 'utilisation_parametre_absente' };
  return { ok: true };
}
