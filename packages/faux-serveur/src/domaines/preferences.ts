import type { HttpHandler } from 'msw';

/** Handlers du domaine « preferences » : aucun pour l'instant. */
export function creerHandlersPreferences(base: string, attendre: () => Promise<void>, options?: object): HttpHandler[] {
  void [base, attendre, options];
  return [];
}
