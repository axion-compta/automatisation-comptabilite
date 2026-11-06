import { creerApp } from './app.js';

export const nom = '@axion/serveur';
export { creerApp, creerRouteur } from './app.js';

/** Démarre le serveur en mémoire (dev:reel). Hôte local seulement. */
export async function demarrer(port = 3001) {
  const app = creerApp();
  await app.listen({ port, host: '127.0.0.1' });
  return app;
}
