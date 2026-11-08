import { http, HttpResponse, type HttpHandler } from 'msw';
import { CATALOGUE_GESTES } from '../../../noyau/src/principes/gestes.js';

/** Handler de `GET /gestes-humains` : les 12 gestes lus dans le catalogue du noyau, sans recopie. */
export function creerHandlersPrincipes(base: string, attendre: () => Promise<void>): HttpHandler[] {
  return [
    http.get(base + '/gestes-humains', async () => {
      await attendre();
      return HttpResponse.json({ body: CATALOGUE_GESTES.map((g) => ({ ...g })), decalage: 0, total: CATALOGUE_GESTES.length });
    }),
  ];
}
