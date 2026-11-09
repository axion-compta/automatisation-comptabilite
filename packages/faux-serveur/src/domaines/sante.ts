import { http, HttpResponse, type HttpHandler } from 'msw';
import { handlersNonImplementesExploitation, type OptionsExploitationFaux } from './options-exploitation.js';
import { creerServiceSante } from '../../../contrat/src/domaines/sante-service.js';

/** Santé des contrôles : lecture seule, servie par le service en mémoire du contrat (mêmes données fictives, même graine). */
export function creerHandlersSante(base: string, attendre: () => Promise<void>): HttpHandler[] {
  const service = creerServiceSante();
  return [
    http.get(base + '/controles/sante', async () => {
      await attendre();
      return HttpResponse.json({ body: service.lire() });
    }),
  ];
}

/** Santé d'exploitation : 501 en attendant L08-T35. */
export const handlersSante = (options: OptionsExploitationFaux): HttpHandler[] =>
  handlersNonImplementesExploitation(options, [['get', '/sante']]);
