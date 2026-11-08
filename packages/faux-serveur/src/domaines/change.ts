import { http, HttpResponse, type HttpHandler } from 'msw';
import { creerServiceChange } from '../../../contrat/src/domaines/change-service.js';

const inconnu = () =>
  HttpResponse.json({ defined: true, code: 'ECART_INCONNU', status: 404, message: 'ECART_INCONNU', data: undefined }, { status: 404 });

/** Explication d'un écart de change : lecture seule, branchée sur le service en mémoire du contrat. */
export function creerHandlersChange(base: string, attendre: () => Promise<void>): HttpHandler[] {
  const service = creerServiceChange();
  return [
    http.get(base + '/ecarts-change/:id/explication', async ({ params }) => {
      await attendre();
      const e = service.expliquer(String(params['id']));
      return e ? HttpResponse.json({ body: e }) : inconnu();
    }),
    http.get(base + '/ecarts-change//explication', async () => {
      await attendre();
      return HttpResponse.json({ defined: false, code: 'BAD_REQUEST', status: 400, message: 'BAD_REQUEST' }, { status: 400 });
    }),
  ];
}
