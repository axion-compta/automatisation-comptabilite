// Bail de lecture du personnel Axion (V3-ROL-008) : lu depuis la console (interface), jamais écrit ici.
// Toute écriture tentée : refus 403 et événement `securite.ecriture_axion_refusee`.
import { autoriser, type ContexteAutorisation, type ObjetAutorisation } from '../../../../packages/noyau/src/securite/autoriser.js';
import { evenementEcritureAxionRefusee, type BrouillonEvenement } from '../../../../packages/noyau/src/securite/evenements.js';
import type { Action, Raison } from '../../../../packages/noyau/src/securite/types.js';

export interface Bail {
  readonly personneId: string;
  /** Société cliente dont le dossier est ouvert en lecture : le bail ne vaut que pour elle. */
  readonly societeId: string;
  /** Référence de l'accord écrit du client (texte fictif en test). */
  readonly accordEcrit: string;
  readonly debutLe: string;
  readonly expireLe: string;
}

/** Lecture des baux auprès de la console : interface, un faux sert aux tests. */
export interface PortBails {
  lire(personneId: string, societeId: string): Promise<Bail | null>;
}

export function creerBailsMemoire(baux: readonly Bail[]): PortBails {
  return { lire: async (personneId, societeId) => baux.find((b) => b.personneId === personneId && b.societeId === societeId) ?? null };
}

/** Un bail court seulement s'il a un accord écrit, une durée d'une heure au plus, et n'est pas échu. */
/** `maxMs` : borne reçue en paramètre (règle 3 de la spec 06 : une heure au plus), jamais écrite ici. */
export function bailCourt(bail: Bail | null, maintenant: number, maxMs: number): boolean {
  if (!Number.isFinite(maxMs) || maxMs <= 0) return false;
  if (bail === null || bail.accordEcrit.trim() === '') return false;
  const debut = Date.parse(bail.debutLe);
  const fin = Date.parse(bail.expireLe);
  if (Number.isNaN(debut) || Number.isNaN(fin) || fin <= debut || fin - debut > maxMs) return false;
  return maintenant >= debut && maintenant < fin;
}

export type Verdict =
  | { readonly statut: 200 }
  | { readonly statut: 403; readonly raison: Raison };

export interface OptionsBail {
  readonly bails: PortBails;
  readonly journaliser: (evenement: BrouillonEvenement) => Promise<void> | void;
  readonly maintenant: () => number;
  /** Durée maximale d'un bail en millisecondes, fournie par l'hôte. */
  readonly maxMs: number;
}

export function creerBailSupport(options: OptionsBail) {
  const { bails, journaliser, maintenant, maxMs } = options;
  async function actif(personneId: string, societeId: string): Promise<boolean> {
    try {
      return bailCourt(await bails.lire(personneId, societeId), maintenant(), maxMs);
    } catch {
      return false;
    }
  }
  return {
    /** Vrai tant que le bail court sur CETTE société : sert au bandeau montré à son client. */
    actif,
    /** Décide pour un membre du personnel Axion sur une société ; sans bail courant sur elle, rien n'est permis. */
    async decider(contexte: ContexteAutorisation, societeId: string, action: Action, objet?: ObjetAutorisation): Promise<Verdict> {
      if (contexte.role !== 'personnel_axion') {
        const d = autoriser(contexte, action, objet);
        return d.permis ? { statut: 200 } : { statut: 403, raison: d.raison };
      }
      if (!(await actif(contexte.personneId, societeId))) return { statut: 403, raison: 'acces_expire' };
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
