import { http, HttpResponse, type HttpHandler } from 'msw';
import { z } from 'zod';
import { creerServicePlan } from '../../../contrat/src/domaines/plan-service.js';

/** Mêmes bornes que la query du contrat (`listerPlan`) ; le filtrage, lui, reste dans le service du contrat. Copie locale : voir la fiche de suivi L01-T39 (export `QueryPlan` dans le contrat). */
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
      const noms = ['classe', 'q', 'limite', 'decalage'];
      // Clé à crochets (classe[]=1) : 400. Le vrai serveur la lit comme classe=1 (écart noté au journal, L01-T39).
      if ([...q.keys()].some((k) => /^[^[]+\[/.test(k))) return erreur('BAD_REQUEST', 400);
      // Paramètre répété : 400, comme le vrai serveur (q.get() ne garderait que la première valeur).
      if (noms.some((n) => q.getAll(n).length > 1)) return erreur('BAD_REQUEST', 400);
      const brut = Object.fromEntries(noms.flatMap((n) => (q.has(n) ? [[n, q.get(n)]] : [])));
      const query = QueryPlan.safeParse(brut);
      if (!query.success) return erreur('BAD_REQUEST', 400);
      const page = service.plan(String(params['exercice']), query.data);
      if (!page) return erreur('EXERCICE_INCONNU', 404);
      return HttpResponse.json(page);
    }),
  ];
}
