import { http, HttpResponse, type HttpHandler } from 'msw';
import { contrat } from '../../../contrat/src/routes.js';
import { creerServiceBloquants } from '../../../contrat/src/domaines/bloquants-service.js';

type Schema = { safeParse: (v: unknown) => { success: boolean; data?: unknown } };
const entree = contrat.bloquants.listerBloquants['~orpc'].inputSchema as Schema;

/** Contrôles bloquants avant une action (lecture seule) : requête validée par le schéma du contrat, verdict du service en mémoire. */
export function creerHandlersBloquants(base: string, attendre: () => Promise<void>): HttpHandler[] {
  const service = creerServiceBloquants();
  return [
    http.get(base + '/controles/bloquants', async ({ request }) => {
      await attendre();
      const r = entree.safeParse({ query: Object.fromEntries(new URL(request.url).searchParams) });
      if (!r.success) return HttpResponse.json({ defined: false, code: 'BAD_REQUEST', status: 400, message: 'BAD_REQUEST' }, { status: 400 });
      return HttpResponse.json({ body: service.lister((r.data as { query: { action: 'validation' | 'tva' | 'export' | 'cloture' } }).query.action) });
    }),
  ];
}
