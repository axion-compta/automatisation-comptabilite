import { setupWorker } from 'msw/browser';
import { creerHandlers, type OptionsFauxServeur } from './handlers.js';

export const nom = '@axion/faux-serveur';
export * from './handlers.js';

/** Démarre le faux serveur dans le navigateur (mode simulé). */
export function demarrerNavigateur(options: OptionsFauxServeur = {}) {
  const worker = setupWorker(...creerHandlers(options));
  return worker.start({ onUnhandledRequest: 'bypass' });
}
