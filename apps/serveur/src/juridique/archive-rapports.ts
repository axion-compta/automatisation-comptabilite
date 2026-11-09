// Orchestration de l'archive des rapports, contre des interfaces (rendu PDF, stockage, validations, horloge).
import {
  ErreurArchiveRapport, documentRapport, entreeArchive, verifierArchive,
  type DocumentRapport, type EntreeArchive, type TypeRapport, type ValidationRapport,
} from '../../../../packages/noyau/src/juridique/archive-rapport.js';

export interface PortRenduPdf { rendre(document: DocumentRapport): Promise<Uint8Array> }
export interface PortArchive {
  lire(nom: string): Promise<EntreeArchive | undefined>;
  ecrire(entree: EntreeArchive, octets: Uint8Array): Promise<void>;
}
export interface PortValidations { lire(exerciceId: string, type: TypeRapport): ValidationRapport | null }
export interface DependancesArchive { rendu: PortRenduPdf; archive: PortArchive; validations: PortValidations; aujourdhui: () => string }
export interface DemandeRapport { type: TypeRapport; exerciceId: string; rubriques: readonly unknown[] }

export class ErreurArchiveRapports extends Error {
  override name = 'ErreurArchiveRapports';
  readonly code = 'archive_existante';
  constructor() {
    super('Une archive différente existe déjà sous ce nom.');
  }
}

export async function apercuRapport(d: DependancesArchive, demande: DemandeRapport): Promise<Uint8Array> {
  return d.rendu.rendre(documentRapport({ ...demande, validation: null }));
}

export async function archiverRapport(d: DependancesArchive, demande: DemandeRapport): Promise<EntreeArchive> {
  const validation = d.validations.lire(demande.exerciceId, demande.type);
  if (validation === null) throw new ErreurArchiveRapport('non_valide', 'Rapport non validé.');
  const document = documentRapport({ ...demande, validation });
  const octets = await d.rendu.rendre(document);
  const entree = entreeArchive(octets, document, d.aujourdhui());
  const existante = await d.archive.lire(entree.nom);
  if (existante !== undefined) {
    if (verifierArchive(octets, existante).ok) return existante;
    throw new ErreurArchiveRapports();
  }
  await d.archive.ecrire(entree, octets);
  return entree;
}
