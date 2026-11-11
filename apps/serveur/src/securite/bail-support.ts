// Bail de lecture du personnel Axion (V3-ROL-008) : lu depuis la console (interface), jamais écrit ici.
// Toute écriture tentée : refus 403 et événement `securite.ecriture_axion_refusee`.
import { autoriser, type ContexteAutorisation, type ObjetAutorisation } from '../../../../packages/noyau/src/securite/autoriser.js';
import { evenementEcritureAxionRefusee, type BrouillonEvenement } from '../../../../packages/noyau/src/securite/evenements.js';
import type { Action, Raison } from '../../../../packages/noyau/src/securite/types.js';

/** Durée maximale d'un bail : une heure (règle 3 de la spec 06). */
export const DUREE_MAX_BAIL_MS = 3_600_000;

export interface Bail {
  readonly personneId: string;
  /** Référence de l'accord écrit du client (texte fictif en test). */
  readonly accordEcrit: string;
  readonly debutLe: string;
  readonly expireLe: string;
}

/** Lecture des baux auprès de la console : interface, un faux sert aux tests. */
export interface PortBails {
  lire(personneId: string): Promise<Bail | null>;
}

export function creerBailsMemoire(baux: readonly Bail[]): PortBails {
  return { lire: async (personneId) => baux.find((b) => b.personneId === personneId) ?? null };
}

/** Un bail court seulement s'il a un accord écrit, une durée d'une heure au plus, et n'est pas échu. */
export function bailCourt(bail: Bail | null, maintenant: number): boolean {
  if (bail === null || bail.accordEcrit.trim() === '') return false;
  const debut = Date.parse(bail.debutLe);
  const fin = Date.parse(bail.expireLe);
  if (Number.isNaN(debut) || Number.isNaN(fin) || fin <= debut || fin - debut > DUREE_MAX_BAIL_MS) return false;
  return maintenant >= debut && maintenant < fin;
}

export type Verdict =
  | { readonly statut: 200 }
  | { readonly statut: 403; readonly raison: Raison };

export interface OptionsBail {
  readonly bails: PortBails;
  readonly journaliser: (evenement: BrouillonEvenement) => Promise<void> | void;
  readonly maintenant: () => number;
}

export function creerBailSupport(options: OptionsBail) {
  const { bails, journaliser, maintenant } = options;
  return {
    /** Vrai tant que le bail court : sert au bandeau montré au client. */
    async actif(personneId: string): Promise<boolean> {
      try {
        return bailCourt(await bails.lire(personneId), maintenant());
      } catch {
        return false;
      }
    },
    /** Décide pour un membre du personnel Axion ; sans bail courant, rien n'est permis. */
    async decider(contexte: ContexteAutorisation, action: Action, objet?: ObjetAutorisation): Promise<Verdict> {
      if (contexte.role !== 'personnel_axion') {
        const d = autoriser(contexte, action, objet);
        return d.permis ? { statut: 200 } : { statut: 403, raison: d.raison };
      }
      if (!(await this.actif(contexte.personneId))) return { statut: 403, raison: 'acces_expire' };
      const d = autoriser(contexte, action, objet);
      if (d.permis) return { statut: 200 };
      if (d.raison === 'personnel_axion_lecture_seule') {
        await journaliser(evenementEcritureAxionRefusee({
          personneId: contexte.personneId, action, horodatage: new Date(maintenant()).toISOString(),
        }));
      }
      return { statut: 403, raison: d.raison };
    },
  };
}
