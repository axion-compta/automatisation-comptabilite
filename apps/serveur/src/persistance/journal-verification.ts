// Interface du journal de vérification en ajout seul. Aucune base, aucun réseau : voir journal-verification-memoire.ts.
import type { LigneJournal } from '../../../../packages/noyau/src/controles/journal.js';

export type CodeJournalVerification = 'ajout_seul' | 'contexte_invalide' | 'ligne_invalide';

/** Le message est le code seul, jamais une valeur. */
export class ErreurJournalVerification extends Error {
  override name = 'ErreurJournalVerification';
  readonly code: CodeJournalVerification;
  constructor(code: CodeJournalVerification) {
    super(code);
    this.code = code;
  }
}

/** La société vient toujours du contexte, jamais d'une ligne. */
export interface ContexteJournal {
  societe: string;
}

export interface JournalVerification {
  ajouterLot(ctx: ContexteJournal, lignes: LigneJournal[]): Promise<void>;
  historique(ctx: ContexteJournal, objetType: string, objetId: string): Promise<LigneJournal[]>;
  modifier(ctx: ContexteJournal, id: string, changements: Partial<LigneJournal>): Promise<void>;
  supprimer(ctx: ContexteJournal, id: string): Promise<void>;
}
