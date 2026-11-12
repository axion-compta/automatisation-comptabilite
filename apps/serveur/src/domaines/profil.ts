import { implement, ORPCError } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import type { Session } from '../../../../packages/noyau/src/session/port.js';
import { creerServiceProfil } from '../../../../packages/contrat/src/domaines/profil-service.js';

/** Contexte ajouté par `app.ts` : la session vérifiée par le jeton (absente si aucun jeton n'est branché). */
export interface ContexteProfil { sessionVerifiee?: Session | undefined }

/** 404 au même corps qu'une route inconnue : `{ code: 'INTROUVABLE', status: 404 }`. */
class Introuvable extends ORPCError<'INTROUVABLE', undefined> {
  constructor() { super('INTROUVABLE', { status: 404 }); }
  override toJSON() { return { code: 'INTROUVABLE', status: 404 } as unknown as ReturnType<ORPCError<'INTROUVABLE', undefined>['toJSON']>; }
}

/** Session exigée (401), puis société du chemin comparée à celle de la session (404 si autre). */
export function exigerSociete(contexte: ContexteProfil, societeChemin: string): Session {
  const session = contexte.sessionVerifiee;
  if (!session) throw new ORPCError('NON_AUTHENTIFIE', { status: 401, message: 'NON_AUTHENTIFIE' });
  if (session.societeId !== societeChemin) throw new Introuvable();
  return session;
}

type ServiceProfil = ReturnType<typeof creerServiceProfil>;

/** Société fictive par défaut : Lemoine Rénovation. La date du jour est lue ici, jamais dans le service. */
export function routesProfil(service: ServiceProfil = creerServiceProfil('soc-lemoine'), aujourdhui: () => string = () => new Date().toISOString().slice(0, 10)) {
  const os = implement(contrat.profil).$context<ContexteProfil>();
  return {
    lireProfil: os.lireProfil.handler(({ input, context }) => (exigerSociete(context, input.params.s), { body: service.lire(input.query?.au, aujourdhui()) })),
  };
}
