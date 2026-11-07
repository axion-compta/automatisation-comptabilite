import type { HttpHandler } from 'msw';

/** Handlers du domaine « alertes » : aucun pour l'instant. */
export function creerHandlersAlertes(base: string, attendre: () => Promise<void>, options?: object): HttpHandler[] {
  void [base, attendre, options];
  return [];
}
