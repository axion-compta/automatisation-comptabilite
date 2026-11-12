import { implement, ORPCError } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import { exigerSociete, type ContexteProfil } from './profil.js';
import type { Session } from '../../../../packages/noyau/src/session/port.js';
import type { Permission } from '../../../../packages/noyau/src/securite/types.js';
import { BornesInvalides, creerServiceFrais } from '../../../../packages/contrat/src/domaines/frais-service.js';

/** Session de la société du chemin (401, 404), puis au moins un des droits demandés (403). L'identité vient de la session seule. */
export function exigerDroit(contexte: ContexteProfil, societe: string, ...droits: readonly Permission[]): Session {
  const session = exigerSociete(contexte, societe);
  if (!droits.some((d) => session.permissions.includes(d))) throw new ORPCError('DROIT_REFUSE', { status: 403 });
  return session;
}

/** Routes des frais (lecture, droit `compta-lire`), branchées sur le service en mémoire. */
export function routesFrais(service: ReturnType<typeof creerServiceFrais> = creerServiceFrais()) {
  const os = implement(contrat.frais).$context<ContexteProfil>();
  return {
    listerFrais: os.listerFrais.handler(({ input, errors, context }) => {
      exigerDroit(context, input.params.s, 'compta-lire');
      try {
        return service.lister(input.query);
      } catch (e) {
        if (e instanceof BornesInvalides) throw errors.BORNES_INVALIDES();
        throw e;
      }
    }),
    lireFrais: os.lireFrais.handler(({ input, errors, context }) => {
      exigerDroit(context, input.params.s, 'compta-lire');
      const f = service.lire(input.params.id);
      if (!f) throw errors.FRAIS_INCONNU();
      return { body: f };
    }),
  };
}
