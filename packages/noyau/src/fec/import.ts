// Vérification d'un FEC avant import : nom, société, doublon, structure, équilibre, dates. Aucun accès disque.
// Tous les codes applicables sont rendus, triés ; la phrase affichée à l'utilisateur n'est pas ici.
import { empreinteSha256 } from '../documents/empreinte.js';
import { estDateValide } from '../dates/civiles.js';
import { controlerDatesExercice, controlerEquilibre } from './controles-equilibre.js';
import { type EcartFec, type ParametresLecture, lireFichierFec } from './controles-structure.js';

export class ErreurImportFec extends Error {
  override name = 'ErreurImportFec';
  readonly code: 'nom_invalide';
  constructor(code: 'nom_invalide') {
    super(code);
    this.code = code;
  }
}

export type CodeImportFec =
  | 'autre_entreprise'
  | 'doublon'
  | 'nom_invalide'
  | 'fichier_de_travail'
  | 'cloture_hors_exercice'
  | 'structure'
  | 'equilibre'
  | 'dates';

export interface EntreeImportFec {
  nomFichier: string;
  octets: Uint8Array;
  sirenSociete: string;
  exercice: { debut: string; fin: string };
  empreintesDejaImportees: readonly string[];
  lecture: ParametresLecture;
}

export type ResultatImportFec =
  | { ok: true; empreinte: string; lignes: number }
  | { ok: false; codes: CodeImportFec[]; ecarts: EcartFec[] };

const NOM = /^([0-9]{9})FEC([0-9]{4})([0-9]{2})([0-9]{2})(_TRAVAIL)?\.[tT][xX][tT]$/;

export function lireNomFichierFec(nom: string): { siren: string; dateCloture: string; travail: boolean } {
  const m = NOM.exec(nom);
  const [, siren, an, mois, jour, travail] = m ?? [];
  const dateCloture = `${an}-${mois}-${jour}`;
  if (m === null || siren === undefined || !estDateValide(dateCloture)) throw new ErreurImportFec('nom_invalide');
  return { siren, dateCloture, travail: travail !== undefined };
}

export function verifierAvantImport(entree: EntreeImportFec): ResultatImportFec {
  const codes = new Set<CodeImportFec>();
  const empreinte = empreinteSha256(entree.octets);
  try {
    const nom = lireNomFichierFec(entree.nomFichier);
    if (nom.siren !== entree.sirenSociete) codes.add('autre_entreprise');
    if (nom.travail) codes.add('fichier_de_travail');
    if (nom.dateCloture < entree.exercice.debut || nom.dateCloture > entree.exercice.fin) codes.add('cloture_hors_exercice');
  } catch (e) {
    if (!(e instanceof ErreurImportFec)) throw e;
    codes.add('nom_invalide');
  }
  if (entree.empreintesDejaImportees.includes(empreinte)) codes.add('doublon');
  const lu = lireFichierFec(entree.octets, entree.lecture);
  const ecarts: EcartFec[] = [...lu.ecarts];
  if (lu.ecarts.length > 0) codes.add('structure');
  const equilibre = controlerEquilibre(lu.lignes);
  if (equilibre.length > 0) codes.add('equilibre');
  const dates = controlerDatesExercice(lu.lignes, entree.exercice);
  if (dates.length > 0) codes.add('dates');
  ecarts.push(...equilibre, ...dates);
  if (codes.size === 0) return { ok: true, empreinte, lignes: lu.lignes.length };
  return { ok: false, codes: [...codes].sort(), ecarts };
}
