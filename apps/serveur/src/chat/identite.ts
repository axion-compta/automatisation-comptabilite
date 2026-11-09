import type { PortSession, Session } from '../../../../packages/noyau/src/session/port.js';
import { ajouterEntree, teteInitiale, type EntreeJournal, type Tete } from '../../../../packages/noyau/src/journal/chaine.js';
import { OUTILS } from '../../../../packages/contrat/src/chat/outils.js';

export type CodeIdentite = 'NON_AUTHENTIFIE' | 'SOCIETE_REFUSEE' | 'ACTEUR_NON_HUMAIN' | 'DROIT_INSUFFISANT';
export class ErreurIdentite extends Error {
  constructor(readonly code: CodeIdentite) { super(code); }
}

/** Journal chaîné d'une société (lot 3) : une ligne par proposition et par application. */
export interface JournalChat {
  noter(b: { horodatage: string; acteur: string; evenement: 'chat.proposition' | 'chat.application'; outil: string; niveau: string; avant?: unknown; apres?: unknown; resultat: string }): void;
  entrees(): readonly EntreeJournal[];
}
export function creerJournalChat(societeId: string, creeLe: string): JournalChat {
  let tete: Tete = teteInitiale(societeId, creeLe);
  const lignes: EntreeJournal[] = [];
  return {
    noter: ({ outil, niveau, resultat, ...b }) => {
      const r = ajouterEntree(tete, { societeId, canal: 'chat', motif: `${outil} ${niveau} ${resultat}`, ...b });
      tete = r.tete; lignes.push(r.entree);
    },
    entrees: () => [...lignes],
  };
}

export interface OptionsIdentite { sessions: PortSession; journal?: JournalChat }

export async function identifier(o: OptionsIdentite, entete: { authorization?: string | undefined }, societe: string): Promise<Session> {
  const jeton = entete.authorization?.replace(/^Bearer /i, '') ?? '';
  const session = jeton === '' ? null : await o.sessions.lire(jeton);
  if (session === null) throw new ErreurIdentite('NON_AUTHENTIFIE');
  if (session.societeId !== societe || !session.societes.includes(societe)) throw new ErreurIdentite('SOCIETE_REFUSEE');
  return session;
}

export const exigerPersonne = (session: Session): void => {
  if (session.nature !== 'personne') throw new ErreurIdentite('ACTEUR_NON_HUMAIN');
};
export function exigerPermissionOutil(session: Session, outil: string): void {
  const permission = OUTILS.find((d) => d.nom === outil)?.permission;
  if (permission === undefined || !(session.permissions as readonly string[]).includes(permission)) throw new ErreurIdentite('DROIT_INSUFFISANT');
}

export function traduire(errors: unknown, e: unknown): never {
  if (!(e instanceof ErreurIdentite)) throw e;
  throw (errors as Record<string, (() => Error) | undefined>)[e.code]?.() ?? e;
}
