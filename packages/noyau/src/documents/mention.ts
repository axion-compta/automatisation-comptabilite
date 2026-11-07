// Codes seulement : les phrases affichées vivent dans packages/textes.

export type ModeTravail = 'autonome' | 'assiste' | 'saisie_seule';
export type NatureDocument = 'officiel' | 'indicatif' | 'travail';
export type StatutExercice = 'ouvert' | 'en_cloture' | 'cloture' | 'rouvert';
export type TypeEtat = 'fec' | 'etat' | 'declaration' | 'paquet';
export type StatutMention = 'brouillon' | 'a_valider' | 'valide';
export type Filigrane = 'aucun' | 'a_valider' | 'indicatif' | 'non_officiel';

export type CodeErreurMention = 'validation_incomplete' | 'valeur_inconnue';

export class ErreurMention extends Error {
  readonly code: CodeErreurMention;
  constructor(code: CodeErreurMention, message: string) {
    super(message);
    this.name = 'ErreurMention';
    this.code = code;
  }
}

export type ResultatNature =
  | { ok: true; nature: NatureDocument }
  | { ok: false; code: 'mode_saisie_seule' | 'exercice_non_cloture' };

const MODES: readonly string[] = ['autonome', 'assiste', 'saisie_seule'];
const NATURES: readonly string[] = ['officiel', 'indicatif', 'travail'];
const EXERCICES: readonly string[] = ['ouvert', 'en_cloture', 'cloture', 'rouvert'];
const TYPES: readonly string[] = ['fec', 'etat', 'declaration', 'paquet'];
const STATUTS: readonly string[] = ['brouillon', 'a_valider', 'valide'];

function connu(liste: readonly string[], valeur: string): void {
  if (!liste.includes(valeur)) throw new ErreurMention('valeur_inconnue', 'Valeur inconnue.');
}

function vide(texte: string | undefined): boolean {
  return texte === undefined || texte.trim() === '';
}

export function natureAutorisee(demande: {
  mode: ModeTravail;
  exerciceStatut: StatutExercice;
  demande: NatureDocument;
  type: TypeEtat;
}): ResultatNature {
  connu(MODES, demande.mode);
  connu(EXERCICES, demande.exerciceStatut);
  connu(NATURES, demande.demande);
  connu(TYPES, demande.type);
  if (demande.demande !== 'officiel') return { ok: true, nature: demande.demande };
  if (demande.mode === 'saisie_seule' && demande.type === 'etat') {
    return { ok: false, code: 'mode_saisie_seule' };
  }
  const exigeCloture = demande.type === 'etat' || demande.type === 'fec';
  if (exigeCloture && demande.exerciceStatut !== 'cloture') {
    return { ok: false, code: 'exercice_non_cloture' };
  }
  return { ok: true, nature: 'officiel' };
}

export function etatMention(entree: {
  statut: StatutMention;
  nature: NatureDocument;
  validePar?: string;
  valideLe?: string;
}): {
  mention: 'prepare_par_ia';
  validation?: { par: string; le: string };
  filigrane: Filigrane;
} {
  connu(STATUTS, entree.statut);
  connu(NATURES, entree.nature);
  let validation: { par: string; le: string } | undefined;
  if (entree.statut === 'valide') {
    if (
      entree.validePar === undefined ||
      entree.valideLe === undefined ||
      vide(entree.validePar) ||
      vide(entree.valideLe)
    ) {
      throw new ErreurMention('validation_incomplete', 'Validateur et date obligatoires.');
    }
    validation = { par: entree.validePar, le: entree.valideLe };
  }
  let filigrane: Filigrane = 'a_valider';
  if (entree.nature === 'indicatif') filigrane = 'indicatif';
  else if (entree.nature === 'travail') filigrane = 'non_officiel';
  else if (entree.statut === 'valide') filigrane = 'aucun';
  return validation === undefined
    ? { mention: 'prepare_par_ia', filigrane }
    : { mention: 'prepare_par_ia', validation, filigrane };
}
