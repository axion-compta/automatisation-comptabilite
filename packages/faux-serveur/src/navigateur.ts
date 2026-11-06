import { setupWorker } from 'msw/browser';
import { creerHandlers, type OptionsFauxServeur } from './handlers.js';

/** Vrai en production : le faux serveur y est interdit. */
export function enProduction(): boolean {
  const meta = import.meta as unknown as { env?: { PROD?: boolean } };
  return Boolean(meta.env?.PROD) || globalThis.process?.env?.['NODE_ENV'] === 'production';
}

/** Démarre le faux serveur dans le navigateur (mode simulé seulement). */
export function demarrerNavigateur(options: OptionsFauxServeur = {}) {
  if (enProduction()) throw new Error('faux serveur interdit en production');
  const worker = setupWorker(...creerHandlers(options));
  return worker.start({ onUnhandledRequest: 'bypass' });
}
