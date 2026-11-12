import { http, type HttpHandler } from 'msw';
import { creerServiceClients } from '../../../contrat/src/domaines/clients-service.js';
import type { ContexteFaux } from '../registres/types.js';

/** Fiche d'un client en lecture seule : même service que le vrai serveur ; 404 si le client est inconnu. */
export function handlersClients(ctx: ContexteFaux): HttpHandler[] {
  const service = creerServiceClients();
  return [
    http.get(ctx.base + '/clients/:code', async ({ params }) => {
      await ctx.attendre();
      const client = service.lire(String(params['code']));
      return client ? Response.json({ body: client }) : ctx.erreur('CLIENT_INCONNU', 404, {});
    }),
  ];
}
