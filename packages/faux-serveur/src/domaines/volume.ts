import type { HttpHandler } from 'msw';
import { handlersNonImplementes, type OptionsAbonnementFaux } from './options-abonnement.js';

/** Volume : en attendant son implémentation, les routes répondent 501. */
export const handlersVolume = (options: OptionsAbonnementFaux): HttpHandler[] =>
  handlersNonImplementes(options, [['get', '/volume']]);
