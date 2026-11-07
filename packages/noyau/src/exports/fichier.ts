// Exports (EX-R3, EX-R5) : nom de fichier et de feuille construits par le serveur, décision de volume.
// Aucun texte de tiers n'est nettoyé en silence : un nom hors règle est refusé. Les limites de volume sont des arguments.
import { ErreurDate, dateValide } from '../interface/dates.js';

export class ErreurFichier extends Error {
  readonly code: 'nom_invalide' | 'parametre_invalide';
  constructor(code: 'nom_invalide' | 'parametre_invalide') {
    super(code);
    this.name = 'ErreurFichier';
    this.code = code;
  }
}

const CODE_VALIDE = /^[a-z0-9_-]{1,40}$/;
const INTERDITS_FEUILLE = /[\\/?*[\]:]/;
const LONGUEUR_FEUILLE_MAX = 31;

export type FormatExport = 'csv' | 'xlsx';
export type DecisionVolume = 'direct' | 'tache' | 'trop_gros';

function exigerCode(s: string): void {
  if (typeof s !== 'string' || !CODE_VALIDE.test(s)) throw new ErreurFichier('nom_invalide');
}

export function nomDeFichier(listeCode: string, societeCode: string, jour: string, format: FormatExport): string {
  exigerCode(listeCode);
  exigerCode(societeCode);
  if (!dateValide(jour)) throw new ErreurDate('date_invalide');
  return listeCode + '_' + societeCode + '_' + jour + '.' + format;
}

export function nomDeFeuille(listeCode: string): string {
  if (typeof listeCode !== 'string' || listeCode.length === 0 || listeCode.length > LONGUEUR_FEUILLE_MAX) throw new ErreurFichier('nom_invalide');
  if (INTERDITS_FEUILLE.test(listeCode)) throw new ErreurFichier('nom_invalide');
  return listeCode;
}

function exigerEntier(n: number): void {
  if (typeof n !== 'number' || !Number.isSafeInteger(n) || n < 0) throw new ErreurFichier('parametre_invalide');
}

export function decisionVolume(nbLignes: number, limites: { direct: number; maximum: number }): DecisionVolume {
  exigerEntier(nbLignes);
  exigerEntier(limites.direct);
  exigerEntier(limites.maximum);
  if (limites.direct > limites.maximum) throw new ErreurFichier('parametre_invalide');
  if (nbLignes <= limites.direct) return 'direct';
  return nbLignes <= limites.maximum ? 'tache' : 'trop_gros';
}
