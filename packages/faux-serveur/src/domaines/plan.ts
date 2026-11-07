import { http, HttpResponse, type HttpHandler } from 'msw';
import { QueryPlan } from '../../../contrat/src/domaines/plan.js';
import { creerServicePlan } from '../../../contrat/src/domaines/plan-service.js';

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
      if ([...q.keys()].some((k) => noms.some((n) => k.startsWith(n + '[')))) return erreur('BAD_REQUEST', 400);
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
