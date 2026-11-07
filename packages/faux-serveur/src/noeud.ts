import { setupServer } from 'msw/node';
import { creerHandlers, type OptionsFauxServeur } from './handlers.js';

/** Démarre le faux serveur côté Node (tests d'écrans en jsdom). Les requêtes hors contrat passent sans être interceptées. */
export function demarrerNoeud(options: OptionsFauxServeur = {}): { fermer: () => void } {
  const serveur = setupServer(...creerHandlers(options));
  serveur.listen({ onUnhandledRequest: 'bypass' });
  return { fermer: () => serveur.close() };
}
