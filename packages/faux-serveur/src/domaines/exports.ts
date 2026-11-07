import type { HttpHandler } from 'msw';

/** Handlers du domaine « exports » : aucun pour l'instant. */
export function creerHandlersExports(base: string, attendre: () => Promise<void>, options?: object): HttpHandler[] {
  void [base, attendre, options];
  return [];
}
