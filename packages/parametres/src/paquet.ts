// Paquet de paramètres versionné : règle au jour D, rejeu sur la version enregistrée.
// Fonctions pures : aucun appel à l'horloge, au hasard ni à un modèle. Aucun montant calculé ici.
import { ParametreLegal, parametreAuJour } from './au-jour.js';

export type CodeErreurPaquet =
  | 'version_vide'
  | 'version_inconnue'
  | 'version_en_double'
  | 'parametre_inconnu'
  | 'cle_vide'
  | 'pays_invalide'
  | 'date_invalide';

export class ErreurPaquet extends Error {
  readonly code: CodeErreurPaquet;
  constructor(code: CodeErreurPaquet, detail = '') {
    super(detail === '' ? code : `${code} : ${detail}`);
    this.name = 'ErreurPaquet';
    this.code = code;
  }
}

export interface PaquetParametres {
  version: string;
  lignes: readonly ParametreLegal[];
}

export interface UtilisationParametre {
  ecritureId: string;
  parametreId: string;
  versionPaquet: string;
  dateReference: string;
}

export interface RegleAuJour {
  ligne: ParametreLegal;
  parametreId: string;
  versionPaquet: string;
  aVerifier: boolean;
}

export type ComparaisonVersion =
  | { identique: true }
  | { identique: false; proposition: 'brouillon'; ancienne: ParametreLegal; nouvelle: ParametreLegal };

export function identifiantParametre(ligne: ParametreLegal): string {
  return `${ligne.cle}|${ligne.pays}|${ligne.effet_debut}`;
}

function verifierVersion(version: string): void {
  if (version === '') throw new ErreurPaquet('version_vide');
}

function verifierDate(date: string): void {
  if (!ParametreLegal.shape.effet_debut.safeParse(date).success) throw new ErreurPaquet('date_invalide', date);
  const t = new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))));
  if (t.toISOString().slice(0, 10) !== date) throw new ErreurPaquet('date_invalide', date);
}

/** Règle en vigueur au jour D dans ce paquet ; absent ou ambigu : ErreurParametre, sans valeur par défaut. */
export function regleAuJour(paquet: PaquetParametres, cle: string, pays: string, date: string): RegleAuJour {
  verifierVersion(paquet.version);
  if (cle === '') throw new ErreurPaquet('cle_vide');
  if (!ParametreLegal.shape.pays.safeParse(pays).success) throw new ErreurPaquet('pays_invalide', pays);
  verifierDate(date);
  const ligne = parametreAuJour(paquet.lignes, cle, pays, date);
  return {
    ligne,
    parametreId: identifiantParametre(ligne),
    versionPaquet: paquet.version,
    aVerifier: ligne.statut !== 'valide',
  };
}

function trouverPaquet(version: string, paquets: readonly PaquetParametres[]): PaquetParametres {
  verifierVersion(version);
  const versions = new Set<string>();
  for (const p of paquets) {
    if (versions.has(p.version)) throw new ErreurPaquet('version_en_double', p.version);
    versions.add(p.version);
  }
  const trouve = paquets.find((p) => p.version === version);
  if (trouve === undefined) throw new ErreurPaquet('version_inconnue', version);
  return trouve;
}

/** Ligne de la version ENREGISTRÉE ; jamais de repli sur la dernière version. */
export function rejouer(utilisation: UtilisationParametre, paquets: readonly PaquetParametres[]): ParametreLegal {
  const paquet = trouverPaquet(utilisation.versionPaquet, paquets);
  const ligne = paquet.lignes.find((l) => identifiantParametre(l) === utilisation.parametreId);
  if (ligne === undefined) throw new ErreurPaquet('parametre_inconnu', utilisation.parametreId);
  return ligne;
}

function empreinte(l: ParametreLegal): string {
  return JSON.stringify([l.cle, l.pays, l.valeur, l.effet_debut, l.effet_fin, l.statut, l.source, l.date_releve]);
}

/** Compare à la dernière version (dernier paquet de la liste) ; une différence ne produit qu'une proposition en brouillon. */
export function comparerAvecDerniere(
  utilisation: UtilisationParametre,
  paquets: readonly PaquetParametres[],
): ComparaisonVersion {
  const ancienne = rejouer(utilisation, paquets);
  const derniere = paquets[paquets.length - 1];
  if (derniere === undefined) throw new ErreurPaquet('version_inconnue');
  const nouvelle = regleAuJour(derniere, ancienne.cle, ancienne.pays, utilisation.dateReference).ligne;
  if (empreinte(ancienne) === empreinte(nouvelle)) return { identique: true };
  return { identique: false, proposition: 'brouillon', ancienne, nouvelle };
}
