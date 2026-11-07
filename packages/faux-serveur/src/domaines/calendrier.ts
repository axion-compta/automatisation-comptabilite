import type { HttpHandler } from 'msw';

/** Handlers du domaine « calendrier » : aucun pour l'instant. */
export function creerHandlersCalendrier(base: string, attendre: () => Promise<void>, options?: object): HttpHandler[] {
  void [base, attendre, options];
  return [];
}
