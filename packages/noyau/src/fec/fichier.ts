// Fichier FEC complet en octets : en-tête, fins de ligne, encodage, marque d'ordre. Aucune écriture sur disque.
import type { ResultatLignesFec } from './lignes.js';

export interface OptionsFichierFec {
  /** Exactement CR LF ou LF. */
  finDeLigne: string;
  marqueOrdreOctets: boolean;
  finDeLigneFinale: boolean;
}

export type CodeErreurFichierFec = 'option_invalide' | 'ligne_vide' | 'ligne_avec_fin_de_ligne';

export class ErreurFichierFec extends Error {
  override name = 'ErreurFichierFec';
  readonly code: CodeErreurFichierFec;
  constructor(code: CodeErreurFichierFec) {
    super(code);
    this.code = code;
  }
}

const CR_LF = String.fromCharCode(13, 10);
const LF = String.fromCharCode(10);
const MARQUE_ORDRE = [0xef, 0xbb, 0xbf];

function verifierOptions(options: OptionsFichierFec): void {
  const o = options as Partial<OptionsFichierFec> | null | undefined;
  const valide =
    o !== null &&
    o !== undefined &&
    (o.finDeLigne === CR_LF || o.finDeLigne === LF) &&
    typeof o.marqueOrdreOctets === 'boolean' &&
    typeof o.finDeLigneFinale === 'boolean';
  if (!valide) throw new ErreurFichierFec('option_invalide');
}

function verifierLigne(ligne: string): void {
  if (ligne === '') throw new ErreurFichierFec('ligne_vide');
  if (ligne.includes(String.fromCharCode(13)) || ligne.includes(LF)) {
    throw new ErreurFichierFec('ligne_avec_fin_de_ligne');
  }
}

export function texteFec(resultat: ResultatLignesFec, options: OptionsFichierFec): string {
  verifierOptions(options);
  const toutes = [resultat.entete, ...resultat.lignes];
  for (const ligne of toutes) verifierLigne(ligne);
  return toutes.join(options.finDeLigne) + (options.finDeLigneFinale ? options.finDeLigne : '');
}

export function fichierFec(resultat: ResultatLignesFec, options: OptionsFichierFec): Uint8Array {
  const texte = texteFec(resultat, options);
  const corps = new TextEncoder().encode(texte);
  if (!options.marqueOrdreOctets) return corps;
  const sortie = new Uint8Array(MARQUE_ORDRE.length + corps.length);
  sortie.set(MARQUE_ORDRE, 0);
  sortie.set(corps, MARQUE_ORDRE.length);
  return sortie;
}
