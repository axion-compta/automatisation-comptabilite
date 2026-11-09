import type { HttpHandler } from 'msw';
import { handlersNonImplementes, type OptionsAbonnementFaux } from './options-abonnement.js';

/** Fin de contrat et gel : en attendant son implémentation, les routes répondent 501. */
export const handlersFinContrat = (options: OptionsAbonnementFaux): HttpHandler[] =>
  handlersNonImplementes(options, [['get', '/fin-contrat'], ['post', '/fin-contrat/accuse'], ['post', '/fin-contrat/gel/levee'], ['post', '/fin-contrat/gel']]);
