// Interfaces d'accès aux documents produits et à la TVA. Aucune base, aucun réseau : voir declarations-memoire.ts.
import type { CaseDeclaration } from '../../../../packages/noyau/src/declarations/cases.js';
import type { ResultatFormules } from '../../../../packages/noyau/src/declarations/formules.js';
import type { DocumentProduit, NouveauDocument, StatutDocument } from '../../../../packages/noyau/src/documents/historique.js';
import type { PeriodeDeclaration, PeriodeTva, StatutPeriodeTva } from '../../../../packages/noyau/src/tva/periodes.js';

const TOUS_DOCUMENT: Record<StatutDocument, true> = { brouillon: true, a_valider: true, valide: true, remplace: true, indicatif: true };
const TOUS_PERIODE: Record<StatutPeriodeTva, true> = { ouverte: true, preparee: true, validee: true, deposee_par_client: true, verrouillee: true };
export const STATUTS_DOCUMENT = Object.keys(TOUS_DOCUMENT) as readonly StatutDocument[];
export const STATUTS_PERIODE = Object.keys(TOUS_PERIODE) as readonly StatutPeriodeTva[];

export type PeriodeTvaEnregistree = PeriodeTva & { id: string; societeId: string; exerciceId: string };
export interface DeclarationEnregistree { id: string; societeId: string; periodeId: string; documentId: string; cases: CaseDeclaration[] }
export interface AccuseDepot { id: string; societeId: string; periodeId: string; pieceId: string; saisiPar: string; saisiLe: string }

export type CodeErreurDepot = 'introuvable' | 'declaration_bloquee' | 'deja_enregistre' | 'societe_invalide' | 'statut_invalide';
export class ErreurDepot extends Error {
  override name = 'ErreurDepot';
  readonly code: CodeErreurDepot;
  readonly detail?: string;
  constructor(code: CodeErreurDepot, detail?: string) {
    super(code);
    this.code = code;
    if (detail !== undefined) this.detail = detail;
  }
}

export interface DepotDocumentsProduits {
  historique(societeId: string, type: DocumentProduit['type'], exerciceId: string): DocumentProduit[];
  parId(societeId: string, id: string): DocumentProduit | null;
  ajouterVersion(societeId: string, nouveau: NouveauDocument): DocumentProduit;
  valider(societeId: string, id: string, validation: { par: string; le: string }): DocumentProduit;
}

export interface DepotTva {
  enregistrerPeriodes(societeId: string, exerciceId: string, periodes: PeriodeDeclaration[]): PeriodeTvaEnregistree[];
  periodes(societeId: string, exerciceId: string): PeriodeTvaEnregistree[];
  periode(societeId: string, id: string): PeriodeTvaEnregistree | null;
  changerStatutPeriode(societeId: string, id: string, vers: StatutPeriodeTva): PeriodeTvaEnregistree;
  enregistrerDeclaration(societeId: string, d: { id: string; periodeId: string; documentId: string; resultat: ResultatFormules }): DeclarationEnregistree;
  declaration(societeId: string, id: string): DeclarationEnregistree | null;
  enregistrerAccuse(societeId: string, accuse: Omit<AccuseDepot, 'societeId'>): AccuseDepot;
}
