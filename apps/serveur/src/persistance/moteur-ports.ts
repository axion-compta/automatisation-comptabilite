// Interfaces de persistance des tables du moteur (spec 13). Aucune base : implémentation en mémoire seulement.
import type { Centimes } from '../../../../packages/noyau/src/argent/index.js';
import type { SourceClassement } from '../../../../packages/noyau/src/classement/rang.js';
import type { AlerteDivergence } from '../../../../packages/noyau/src/classement/divergences.js';
import type { ResultatSoldeBanque } from '../../../../packages/noyau/src/controles/regles/solde-banque.js';
import type { InstantaneCloture } from '../../../../packages/noyau/src/conservation/relecture-exercice.js';
import type { AssocieParts } from '../../../../packages/noyau/src/capital/liberation.js';
import type { AffectationVoulue } from '../../../../packages/noyau/src/cloture/ecriture-affectation.js';
import type { TypeDocument } from '../../../../packages/noyau/src/assemblee/documents.js';
import type { TauxSaisi } from '../../../../packages/noyau/src/change/taux.js';
import type { Section, VersionVentilation } from '../../../../packages/noyau/src/analytique/ventilation.js';

export type NomTable =
  | 'fiche_fournisseur' | 'alerte_divergence' | 'controle_solde_banque' | 'snapshot_cloture' | 'associe'
  | 'mouvement_capital' | 'affectation_resultat' | 'echeance_fiscale' | 'document_assemblee' | 'taux_change'
  | 'axe_analytique' | 'section_analytique' | 'ventilation_analytique';

interface Base { id: string; societeId: string }
export interface LigneFicheFournisseur extends Base { nom: string; compte: string; source: SourceClassement }
export interface LigneAlerteDivergence extends Base, AlerteDivergence {}
export interface LigneControleSoldeBanque extends Base, ResultatSoldeBanque { exerciceId: string }
export interface LigneSnapshotCloture extends Base, InstantaneCloture { version: number; horodatage: string }
export interface LigneAssocie extends Base, AssocieParts { nom: string }
export interface LigneMouvementCapital extends Base { associeId: string; date: string; montant: Centimes }
export interface LigneAffectationResultat extends Base, AffectationVoulue { exerciceId: string }
export interface LigneEcheanceFiscale extends Base { code: string; date: string; parametre: string; source: string; statut: 'a_verifier' | 'a_venir' | 'faite' }
export interface LigneDocumentAssemblee extends Base { type: TypeDocument; exerciceId: string; date: string }
export interface LigneTauxChange extends Base, TauxSaisi { pariteFixe: boolean }
export interface LigneAxeAnalytique extends Base { code: string; libelle: string }
export interface LigneSectionAnalytique extends Base, Section { axeId: string; code: string }
export interface LigneVentilationAnalytique extends Base, VersionVentilation {}

export interface LignesMoteur {
  fiche_fournisseur: LigneFicheFournisseur;
  alerte_divergence: LigneAlerteDivergence;
  controle_solde_banque: LigneControleSoldeBanque;
  snapshot_cloture: LigneSnapshotCloture;
  associe: LigneAssocie;
  mouvement_capital: LigneMouvementCapital;
  affectation_resultat: LigneAffectationResultat;
  echeance_fiscale: LigneEcheanceFiscale;
  document_assemblee: LigneDocumentAssemblee;
  taux_change: LigneTauxChange;
  axe_analytique: LigneAxeAnalytique;
  section_analytique: LigneSectionAnalytique;
  ventilation_analytique: LigneVentilationAnalytique;
}

type Regle = { mode: 'ajout_seul' | 'modifiable'; montants: readonly string[] };
const modifiable = (...montants: string[]): Regle => Object.freeze({ mode: 'modifiable', montants: Object.freeze(montants) });
const ajoutSeul = (...montants: string[]): Regle => Object.freeze({ mode: 'ajout_seul', montants: Object.freeze(montants) });

export const TABLES_MOTEUR: Readonly<Record<NomTable, Regle>> = Object.freeze({
  fiche_fournisseur: modifiable(),
  alerte_divergence: modifiable(),
  controle_solde_banque: modifiable('ecart'),
  snapshot_cloture: ajoutSeul('totalDebit', 'totalCredit'),
  associe: modifiable(),
  mouvement_capital: modifiable('montant'),
  affectation_resultat: modifiable('resultat', 'apurementPertes', 'reserve', 'dividende'),
  echeance_fiscale: modifiable(),
  document_assemblee: modifiable(),
  taux_change: modifiable(),
  axe_analytique: modifiable(),
  section_analytique: modifiable(),
  ventilation_analytique: ajoutSeul(),
});

export type CodeErreurPersistance = 'ajout_seul' | 'doublon' | 'absent' | 'montant_invalide';
export class ErreurPersistance extends Error {
  override name = 'ErreurPersistance';
  readonly code: CodeErreurPersistance;
  constructor(code: CodeErreurPersistance, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

export interface TableMoteur<T> {
  ajouter(ligne: T): Promise<void>;
  modifier(ligne: T): Promise<void>;
  supprimer(societeId: string, id: string): Promise<void>;
  lire(societeId: string, id: string): Promise<T | null>;
  lister(societeId: string): Promise<T[]>;
}

export interface PortMoteur {
  table<N extends NomTable>(nom: N): TableMoteur<LignesMoteur[N]>;
  dernierInstantane(societeId: string, exerciceId: string): Promise<LigneSnapshotCloture | null>;
}
