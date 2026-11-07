import type { HttpHandler } from 'msw';

/** Handlers du domaine « tableau-de-bord » : aucun pour l'instant. */
export function creerHandlersTableauDeBord(base: string, attendre: () => Promise<void>, options?: object): HttpHandler[] {
  void [base, attendre, options];
  return [];
}
