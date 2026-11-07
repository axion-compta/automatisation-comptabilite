import { http, HttpResponse, type HttpHandler } from 'msw';
import { z } from 'zod';
import { creerServicePlan } from '../../../contrat/src/domaines/plan-service.js';

/** Mêmes bornes que la query du contrat (`listerPlan`) ; le filtrage, lui, reste dans le service du contrat. */
const QueryPlan = z.object({
  classe: z.coerce.number().int().min(1).max(7).optional(),
  q: z.string().max(50).optional(),
  limite: z.coerce.number().int().min(1).max(100).optional(),
  decalage: z.coerce.number().int().min(0).optional(),
});

const erreur = (code: string, status: number) =>
  HttpResponse.json({ defined: status === 404, code, status, message: code }, { status });

/** Handlers de `GET /exercices` et `GET /exercices/:exercice/plan`, branchés sur le service du contrat. */
export function creerHandlersPlan(base: string, attendre: () => Promise<void>): HttpHandler[] {
  const service = creerServicePlan();
  return [
    http.get(base + '/exercices', async () => {
      await attendre();
      return HttpResponse.json(service.exercices());
    }),

    http.get(base + '/exercices/:exercice/plan', async ({ request, params }) => {
      await attendre();
      const q = new URL(request.url).searchParams;
      const brut = Object.fromEntries(['classe', 'q', 'limite', 'decalage'].flatMap((n) => (q.has(n) ? [[n, q.get(n)]] : [])));
      const query = QueryPlan.safeParse(brut);
      if (!query.success) return erreur('BAD_REQUEST', 400);
      const page = service.plan(String(params['exercice']), query.data);
      if (!page) return erreur('EXERCICE_INCONNU', 404);
      return HttpResponse.json(page);
    }),
  ];
}
