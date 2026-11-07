import { ErreurSecurite } from './types.js';

export type MetaIA = Readonly<Record<string, unknown>>;

const CLES_MARQUEUR = ['genere_par_ia', 'modele', 'version', 'modifie_par_personne'] as const;

const refuser = (): never => {
  throw new ErreurSecurite('argument_invalide');
};
const texteNonVide = (v: unknown): string => (typeof v === 'string' && v.trim() !== '' ? v : refuser());
const copie = (meta: MetaIA): Record<string, unknown> =>
  typeof meta === 'object' && meta !== null ? { ...meta } : refuser();

/** Vrai seulement si `genere_par_ia` vaut exactement le booléen `true`. */
export function estGenereParIA(meta: MetaIA): boolean {
  return typeof meta === 'object' && meta !== null && meta.genere_par_ia === true;
}

export function marquerGenereParIA(meta: MetaIA, ia: { modele: string; version: string }): Record<string, unknown> {
  const sortie = copie(meta);
  const { modele, version } = copie(ia);
  sortie.genere_par_ia = true;
  sortie.modele = texteNonVide(modele);
  sortie.version = texteNonVide(version);
  return sortie;
}

/** Un brouillon d'IA retouché reste d'origine IA ; un texte humain n'est pas marqué. */
export function marquerModifieParPersonne(meta: MetaIA, personneId: string): Record<string, unknown> {
  texteNonVide(personneId);
  const sortie = copie(meta);
  if (estGenereParIA(sortie)) sortie.modifie_par_personne = true;
  return sortie;
}

/** Texte écrit de zéro par une personne : aucune trace de marqueur. */
export function metaSaisieHumaine(meta: MetaIA): Record<string, unknown> {
  const sortie = copie(meta);
  for (const cle of CLES_MARQUEUR) delete sortie[cle];
  return sortie;
}
