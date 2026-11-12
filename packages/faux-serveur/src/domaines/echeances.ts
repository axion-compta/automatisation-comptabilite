import { http, HttpResponse, type HttpHandler } from 'msw';
import { contrat } from '../../../contrat/src/routes.js';
import { creerServiceEcheances, ErreurEcheances } from '../../../contrat/src/domaines/echeances-service.js';

const erreur = (code: string, status: number) => HttpResponse.json({ defined: false, code, status, message: code }, { status });

type Schema = { safeParse: (v: unknown) => { success: boolean; data?: unknown } };

/** Handler des échéances d'un intervalle (lecture seule), branché sur le service du contrat. */
export function creerHandlersEcheances(base: string, attendre: () => Promise<void>): HttpHandler[] {
  const service = creerServiceEcheances();
  return [
    http.get(base + '/echeances', async ({ request }) => {
      await attendre();
      const route = contrat.echeances.listerEcheances as unknown as { '~orpc': { inputSchema: Schema } };
      const e = route['~orpc'].inputSchema.safeParse({ query: Object.fromEntries(new URL(request.url).searchParams) });
      if (!e.success) return erreur('BAD_REQUEST', 400);
      const { du, au } = (e.data as { query: { du: string; au: string } }).query;
      try {
        return HttpResponse.json(service.lister(du, au));
      } catch (err) {
        if (err instanceof ErreurEcheances) return erreur('BAD_REQUEST', 400);
        throw err;
      }
    }),
  ];
}
