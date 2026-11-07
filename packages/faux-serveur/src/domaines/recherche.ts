import type { HttpHandler } from 'msw';

/** Handlers du domaine « recherche » : aucun pour l'instant. */
export function creerHandlersRecherche(base: string, attendre: () => Promise<void>, options?: object): HttpHandler[] {
  void [base, attendre, options];
  return [];
}
