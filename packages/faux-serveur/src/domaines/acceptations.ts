import type { HttpHandler } from 'msw';
import { handlersNonImplementes, type OptionsAbonnementFaux } from './options-abonnement.js';

/** Acceptations : en attendant son implémentation, les routes répondent 501. */
export const handlersAcceptations = (options: OptionsAbonnementFaux): HttpHandler[] =>
  handlersNonImplementes(options, [['get', '/documents-contractuels/a-accepter'], ['post', '/acceptations']]);
