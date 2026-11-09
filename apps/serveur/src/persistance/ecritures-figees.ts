// Inaltérabilité des écritures validées : interface et simulation en mémoire du déclencheur de base.
// Aucune base réelle ici : le déclencheur SQL et les rôles attendent la console (D29).
import type { Ecriture } from '../../../../packages/noyau/src/ecritures/modele.js';

export interface PortEcritures {
  ajouter(societeId: string, exerciceId: string, e: Ecriture): Promise<void>;
  modifier(societeId: string, e: Ecriture): Promise<void>;
  lister(societeId: string, exerciceId: string): Promise<Ecriture[]>;
}

export type CodeErreurInalterable = 'ligne_validee' | 'absent' | 'doublon';
export class ErreurInalterable extends Error {
  override name = 'ErreurInalterable';
  readonly code: CodeErreurInalterable;
  constructor(code: CodeErreurInalterable) { super(code); this.code = code; }
}

export interface LigneStockee { societeId: string; exerciceId: string; ecriture: Ecriture }
export const cleEcriture = (societeId: string, id: string): string => JSON.stringify([societeId, id]);

/** Simule le déclencheur : une écriture stockée au statut valide ne change plus, même un drapeau. */
export class EcrituresMemoire implements PortEcritures {
  constructor(private readonly stock: Map<string, LigneStockee> = new Map()) {}

  async ajouter(societeId: string, exerciceId: string, e: Ecriture): Promise<void> {
    const cle = cleEcriture(societeId, e.id);
    if (this.stock.has(cle)) throw new ErreurInalterable('doublon');
    this.stock.set(cle, { societeId, exerciceId, ecriture: structuredClone(e) });
  }

  async modifier(societeId: string, e: Ecriture): Promise<void> {
    const cle = cleEcriture(societeId, e.id);
    const actuelle = this.stock.get(cle);
    if (!actuelle) throw new ErreurInalterable('absent');
    if (actuelle.ecriture.statut === 'valide') throw new ErreurInalterable('ligne_validee');
    this.stock.set(cle, { ...actuelle, ecriture: structuredClone(e) });
  }

  async lister(societeId: string, exerciceId: string): Promise<Ecriture[]> {
    return [...this.stock.values()]
      .filter((l) => l.societeId === societeId && l.exerciceId === exerciceId)
      .map((l) => structuredClone(l.ecriture))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }
}
