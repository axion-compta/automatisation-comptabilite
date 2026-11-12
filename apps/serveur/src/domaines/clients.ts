import type { implement } from '@orpc/server';
import type { contrat } from '../../../../packages/contrat/src/routes.js';
import { creerServiceClients } from '../../../../packages/contrat/src/domaines/clients-service.js';

/** Fiche d'un client (lecture seule), sur le service en mémoire. */
export function implementerClients(os: ReturnType<typeof implement<typeof contrat>>) {
  const service = creerServiceClients();
  return {
    lireClient: os.clients.lireClient.handler(({ input, errors }) => {
      const c = service.lire(input.params.code);
      if (!c) throw errors.CLIENT_INCONNU();
      return { body: c };
    }),
  };
}
