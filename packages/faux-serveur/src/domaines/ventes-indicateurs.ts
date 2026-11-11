import { http, type HttpHandler } from 'msw';
import { QueryIndicateurs } from '../../../contrat/src/domaines/ventes-indicateurs.js';
import { creerServiceIndicateurs } from '../../../contrat/src/domaines/ventes-indicateurs-service.js';
import type { ContexteFaux } from '../registres/types.js';

/** Indicateurs du mois et suites de numéros (lecture seule) : même service que le vrai serveur ; 400 si `mois` est invalide. */
export function handlersVentesIndicateurs(ctx: ContexteFaux): HttpHandler[] {
  const service = creerServiceIndicateurs();
  return [
    http.get(ctx.base + '/ventes/indicateurs', async ({ request }) => {
      await ctx.attendre();
      const query = QueryIndicateurs.safeParse(Object.fromEntries(new URL(request.url).searchParams));
      if (!query.success) return ctx.erreur('BAD_REQUEST', 400);
      return Response.json({ body: service.lireIndicateurs(query.data.mois, query.data.avecPropositions === 'true') });
    }),
    http.get(ctx.base + '/ventes/series', async () => {
      await ctx.attendre();
      return Response.json({ body: service.listerSeries() });
    }),
  ];
}
