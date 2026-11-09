import type { HttpHandler } from 'msw';
import { handlersNonImplementes, type OptionsAbonnementFaux } from './options-abonnement.js';

/** Accès : en attendant son implémentation, les routes répondent 501. */
export const handlersAcces = (options: OptionsAbonnementFaux): HttpHandler[] =>
  handlersNonImplementes(options, [['get', '/acces']]);
