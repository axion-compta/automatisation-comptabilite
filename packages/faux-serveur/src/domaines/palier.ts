import type { HttpHandler } from 'msw';
import { handlersNonImplementes, type OptionsAbonnementFaux } from './options-abonnement.js';

/** Demande de palier : en attendant son implémentation, les routes répondent 501. */
export const handlersPalier = (options: OptionsAbonnementFaux): HttpHandler[] =>
  handlersNonImplementes(options, [['post', '/abonnement/demandes-palier']]);
