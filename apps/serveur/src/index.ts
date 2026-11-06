import { creerApp } from './app.js';

export const nom = '@axion/serveur';
export { creerApp, creerRouteur } from './app.js';

/** Démarre le serveur en mémoire (dev:reel). Hôte local seulement, jamais en production. */
export async function demarrer(port = 3001) {
  if (process.env['NODE_ENV'] === 'production') throw new Error('serveur en mémoire interdit en production');
  const app = creerApp();
  await app.listen({ port, host: '127.0.0.1' });
  return app;
}
