// Assemblée : liste des documents selon la forme, le nombre d'associés et le mode de décision.
// Codes seulement ; un modèle sans version approuvée bloque toute production (aucun document).

export type FormeSociete = 'EI' | 'EURL' | 'SASU' | 'SARL' | 'SAS';
export type ModeDecision = 'assemblee' | 'consultation_ecrite' | 'acte_unanime';

export type TypeDocument =
  | 'decision_associe_unique'
  | 'convocation'
  | 'ordre_du_jour'
  | 'feuille_presence'
  | 'pv_ag'
  | 'consultation_ecrite'
  | 'pv_consultation'
  | 'acte_unanime';

export class ErreurAssemblee extends Error {
  override name = 'ErreurAssemblee';
  readonly code: 'entree_invalide';
  constructor(code: 'entree_invalide', message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

export interface SocieteAssemblee {
  forme: FormeSociete;
  nbAssocies: number;
  modeDecision?: ModeDecision;
}

export interface ModeleDocument {
  type: TypeDocument;
  version?: string;
  dateModele?: string;
  approuve: boolean;
}

export interface DocumentAssemblee {
  type: TypeDocument;
  versionModele: string;
  dateModele: string;
  mention: 'prepare_par_ia_a_faire_valider';
  aVerifier: boolean;
}

export type ResultatDocuments =
  | { statut: 'documents'; documents: DocumentAssemblee[] }
  | { statut: 'non_applicable' }
  | { statut: 'refus'; code: 'mode_decision_absent' }
  | { statut: 'refus'; code: 'modele_a_faire_valider'; types: TypeDocument[] };

const DOCUMENTS_ASSEMBLEE: readonly TypeDocument[] = ['convocation', 'ordre_du_jour', 'feuille_presence', 'pv_ag'];
const FORMES: readonly FormeSociete[] = ['EI', 'EURL', 'SASU', 'SARL', 'SAS'];

function requis(societe: SocieteAssemblee): readonly TypeDocument[] | 'mode_absent' {
  if (societe.nbAssocies === 1) return ['decision_associe_unique'];
  if (societe.forme === 'SARL') return DOCUMENTS_ASSEMBLEE;
  switch (societe.modeDecision) {
    case 'assemblee':
      return DOCUMENTS_ASSEMBLEE;
    case 'consultation_ecrite':
      return ['consultation_ecrite', 'pv_consultation'];
    case 'acte_unanime':
      return ['acte_unanime'];
    default:
      return 'mode_absent';
  }
}

function renseigne(t: string | undefined): t is string {
  return t !== undefined && t.trim() !== '';
}

export function documentsAssemblee(
  societe: SocieteAssemblee,
  modeles: readonly ModeleDocument[],
): ResultatDocuments {
  if (!Number.isSafeInteger(societe.nbAssocies) || societe.nbAssocies < 1 || !FORMES.includes(societe.forme)) {
    throw new ErreurAssemblee('entree_invalide', 'Forme inconnue ou nombre d\'associés invalide.');
  }
  if (societe.forme === 'EI') return { statut: 'non_applicable' };
  if (societe.nbAssocies > 1 && (societe.forme === 'SASU' || societe.forme === 'EURL')) {
    throw new ErreurAssemblee('entree_invalide', 'Une société unipersonnelle n\'a qu\'un associé.');
  }
  const liste = requis(societe);
  if (liste === 'mode_absent') return { statut: 'refus', code: 'mode_decision_absent' };

  const documents: DocumentAssemblee[] = [];
  const enCause: TypeDocument[] = [];
  for (const type of liste) {
    const m = modeles.find(
      (x) => x.type === type && x.approuve && renseigne(x.version) && renseigne(x.dateModele),
    );
    if (m?.version === undefined || m.dateModele === undefined) {
      enCause.push(type);
      continue;
    }
    documents.push({
      type,
      versionModele: m.version,
      dateModele: m.dateModele,
      mention: 'prepare_par_ia_a_faire_valider',
      aVerifier: type === 'feuille_presence',
    });
  }
  if (enCause.length > 0) {
    return { statut: 'refus', code: 'modele_a_faire_valider', types: enCause.sort() };
  }
  return { statut: 'documents', documents };
}
