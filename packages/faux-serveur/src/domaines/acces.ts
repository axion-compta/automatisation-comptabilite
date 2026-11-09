import { http, HttpResponse, type HttpHandler } from 'msw';
import { creerServiceAcces } from '../../../contrat/src/domaines/acces-service.js';
import { scenarioDeLaRequete, type OptionsAbonnementFaux } from './options-abonnement.js';

/** `GET /acces` : le même service que le vrai serveur, avec le scénario de la requête. */
export const handlersAcces = (options: OptionsAbonnementFaux): HttpHandler[] => [
  http.get(options.base + '/acces', async ({ request }) => {
    await options.attendre();
    return HttpResponse.json(creerServiceAcces({ horloge: options.horloge, scenario: scenarioDeLaRequete(request, options) }).lire());
  }),
];
