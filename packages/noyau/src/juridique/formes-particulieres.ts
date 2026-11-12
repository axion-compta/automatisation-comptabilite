// Volet juridique des associations et des sociétés en formation. Fonctions pures ; l'IA prépare, une personne valide, rien n'est déposé.
// Aucune valeur légale en dur : organe et documents sont fournis par l'appelant, « à vérifier » tant qu'ils ne sont pas confirmés.

export type MentionDocument = 'prepare_par_ia_a_faire_valider';
export interface ParametreVerifie<T> {
  valeur: T;
  confirme: boolean;
}
export interface DocumentJuridique {
  code: string;
  mention: MentionDocument;
  aVerifier: boolean;
}
export interface ParametresAssociation {
  organeApprobation: ParametreVerifie<string>;
  documents: ParametreVerifie<readonly string[]>;
  propositionDividende?: boolean;
}
export type EtatFormation = 'en_formation' | 'immatriculee';
export interface ActeFormation {
  id: string;
  date: string;
  repris: boolean;
}
export type ResultatAssociation =
  | { statut: 'volet'; organeApprobation: string; documents: DocumentJuridique[]; dividendes: 'interdits'; aVerifier: boolean }
  | { statut: 'refus'; code: 'association_sans_dividende' };
export type ResultatFormation =
  | { statut: 'en_formation'; actesAReprendre: string[]; documentReprise: DocumentJuridique; dividendes: 'aucun' }
  | { statut: 'immatriculee'; actesAReprendre: string[] }
  | { statut: 'refus'; code: 'societe_en_formation' };

export class ErreurFormesParticulieres extends Error {
  override name = 'ErreurFormesParticulieres';
  readonly code: 'entree_invalide';
  constructor(code: 'entree_invalide', message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

const MENTION: MentionDocument = 'prepare_par_ia_a_faire_valider';

function codeValide(t: unknown): t is string {
  return typeof t === 'string' && t.trim() !== '';
}
function exiger(ok: boolean, message: string): void {
  if (!ok) throw new ErreurFormesParticulieres('entree_invalide', message);
}
function document(code: string, aVerifier: boolean): DocumentJuridique {
  return { code, mention: MENTION, aVerifier };
}

export function voletAssociation(p: ParametresAssociation): ResultatAssociation {
  exiger(codeValide(p.organeApprobation?.valeur), 'Organe d\'approbation absent.');
  const codes = p.documents?.valeur;
  exiger(Array.isArray(codes) && codes.length > 0 && codes.every(codeValide) && new Set(codes).size === codes.length, 'Liste de documents invalide.');
  if (p.propositionDividende === true) return { statut: 'refus', code: 'association_sans_dividende' };
  const aVerifier = !p.organeApprobation.confirme || !p.documents.confirme;
  return {
    statut: 'volet',
    organeApprobation: p.organeApprobation.valeur,
    documents: codes.map((c) => document(c, aVerifier)),
    dividendes: 'interdits',
    aVerifier,
  };
}

export function voletEnFormation(
  etat: EtatFormation,
  actes: readonly ActeFormation[],
  parametres: { documentReprise: ParametreVerifie<string> },
  options: { propositionDividende?: boolean } = {},
): ResultatFormation {
  exiger(etat === 'en_formation' || etat === 'immatriculee', 'État inconnu.');
  exiger(actes.every((a) => codeValide(a.id) && /^\d{4}-\d{2}-\d{2}$/.test(a.date)), 'Acte invalide.');
  exiger(codeValide(parametres.documentReprise?.valeur), 'Document de reprise absent.');
  const actesAReprendre = actes
    .filter((a) => !a.repris)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    .map((a) => a.id);
  if (etat === 'immatriculee') return { statut: 'immatriculee', actesAReprendre };
  if (options.propositionDividende === true) return { statut: 'refus', code: 'societe_en_formation' };
  return {
    statut: 'en_formation',
    actesAReprendre,
    documentReprise: document(parametres.documentReprise.valeur, !parametres.documentReprise.confirme),
    dividendes: 'aucun',
  };
}
