import {
  CANAUX_COUPES,
  estCoupe,
  poserArret,
  reprendre,
  type CanalCoupe,
  type Cible,
  type Drapeaux,
  type EvenementArret,
  type EvenementReprise,
} from '../../../../packages/noyau/src/securite/arret.js';
import type { Role } from '../../../../packages/noyau/src/securite/types.js';

/** Stockage du drapeau : seule l'implémentation en mémoire existe, le stockage réel sera branché plus tard. */
export interface StockageDrapeaux {
  lire(): Drapeaux;
  ecrire(drapeaux: Drapeaux): void;
}

export type EvenementJournal = EvenementArret | EvenementReprise;
export interface JournalArret {
  ajouter(evenement: EvenementJournal): void;
}

export function stockageEnMemoire(initial: Drapeaux = { societes: {} }): StockageDrapeaux {
  let courant = initial;
  return { lire: () => courant, ecrire: (d) => void (courant = d) };
}

export function journalEnMemoire(): JournalArret & { evenements: () => readonly EvenementJournal[] } {
  const liste: EvenementJournal[] = [];
  return { ajouter: (e) => void liste.push(e), evenements: () => [...liste] };
}

/** Faux serveur de la console : aucune commande réelle, la commande « en 1 clic » est simulée. */
export function creerArretConsole(stockage: StockageDrapeaux, journal: JournalArret) {
  return {
    /** À brancher sur l'option `arret.lire` (L06-T27). */
    lire: (): Drapeaux => stockage.lire(),
    commandeArret(cible: Cible, par: string, maintenant: string): boolean {
      const r = poserArret(stockage.lire(), cible, par, maintenant);
      if (r.evenement === undefined) return false;
      stockage.ecrire(r.drapeaux);
      journal.ajouter(r.evenement);
      return true;
    },
    /** Reprise explicite : réservée à l'administrateur, toujours journalisée. */
    reprise(cible: Cible, personne: { id: string; role: Role }, maintenant: string): boolean {
      const r = reprendre(stockage.lire(), cible, personne, maintenant);
      if (!r.ok) return false;
      stockage.ecrire(r.drapeaux);
      journal.ajouter(r.evenement);
      return true;
    },
    /** Vrai si le canal est coupé pour cette société (en cas de lecture douteuse, on coupe). */
    coupe(canal: CanalCoupe, societeId?: string): boolean {
      try {
        return estCoupe(stockage.lire(), societeId, canal);
      } catch {
        return true;
      }
    },
    canaux: CANAUX_COUPES,
  };
}
