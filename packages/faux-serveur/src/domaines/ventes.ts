import { http, type HttpHandler } from 'msw';
import { QueryVentes } from '../../../contrat/src/domaines/ventes.js';
import { creerServiceVentes } from '../../../contrat/src/domaines/ventes-service.js';
import type { ContexteFaux } from '../registres/types.js';

/** Ventes en lecture seule : même service que le vrai serveur ; 400 si la query est invalide, 404 si la vente est inconnue. */
export function handlersVentes(ctx: ContexteFaux): HttpHandler[] {
  const service = creerServiceVentes();
  return [
    http.get(ctx.base + '/ventes', async ({ request }) => {
      await ctx.attendre();
      const brut = Object.fromEntries(new URL(request.url).searchParams);
      const query = QueryVentes.safeParse(brut);
      if (!query.success) return ctx.erreur('BAD_REQUEST', 400);
      return Response.json(service.lister(query.data));
    }),
    http.get(ctx.base + '/ventes/:id', async ({ params }) => {
      await ctx.attendre();
      const vente = service.lire(String(params['id']));
      return vente ? Response.json({ body: vente }) : ctx.erreur('VENTE_INCONNUE', 404, {});
    }),
  ];
}
