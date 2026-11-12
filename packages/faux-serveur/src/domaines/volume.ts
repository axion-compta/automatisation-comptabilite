import { http, HttpResponse, type HttpHandler } from 'msw';
import { creerServiceVolume } from '../../../contrat/src/domaines/volume-service.js';
import { scenarioDeLaRequete, type OptionsAbonnementFaux } from './options-abonnement.js';

/** `GET /volume` : le même service que le vrai serveur, avec le scénario de la requête. */
export const handlersVolume = (options: OptionsAbonnementFaux): HttpHandler[] => [
  http.get(options.base + '/volume', async ({ request }) => {
    await options.attendre();
    return HttpResponse.json(creerServiceVolume({ horloge: options.horloge, scenario: scenarioDeLaRequete(request, options) }).lire());
  }),
];
