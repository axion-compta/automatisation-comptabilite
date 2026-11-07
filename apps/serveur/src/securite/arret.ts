import type { FastifyInstance, FastifyRequest } from 'fastify';
import { estCoupe, type Drapeaux } from '../../../../packages/noyau/src/securite/arret.js';
import type { OptionsSecurite } from './index.js';

export const nom = 'arret';

export type OptionArret = { lire: () => Drapeaux; societeDe?: (requete: FastifyRequest) => string | undefined };

const CORPS = { defined: false, code: 'ARRET_URGENCE', status: 503, message: 'ARRET_URGENCE' } as const;

/** Vrai si l'API est coupée ; toute lecture douteuse coupe aussi (en cas de doute, on coupe). */
function coupe(option: OptionArret, requete: FastifyRequest): boolean {
  try {
    const drapeaux = option.lire();
    if (typeof drapeaux?.societes !== 'object' || drapeaux.societes === null) return true;
    return estCoupe(drapeaux, option.societeDe?.(requete), 'api');
  } catch {
    return true;
  }
}

export function installer(app: FastifyInstance, options: OptionsSecurite): void {
  const option = options.arret as OptionArret | undefined;
  if (option === undefined) return;
  if (typeof option !== 'object' || option === null || typeof option.lire !== 'function') throw new Error('option arret invalide');
  if (option.societeDe !== undefined && typeof option.societeDe !== 'function') throw new Error('option arret invalide');
  app.addHook('onRequest', async (requete, reponse) => {
    if (coupe(option, requete)) return reponse.status(503).send(CORPS);
  });
}
