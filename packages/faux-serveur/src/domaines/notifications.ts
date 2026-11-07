import type { HttpHandler } from 'msw';

/** Handlers du domaine « notifications » : aucun pour l'instant. */
export function creerHandlersNotifications(base: string, attendre: () => Promise<void>, options?: object): HttpHandler[] {
  void [base, attendre, options];
  return [];
}
