import { implement } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import { CATALOGUE_GESTES } from '../../../../packages/noyau/src/principes/gestes.js';

/** Routes des principes : liste fermée des gestes humains, en lecture seule. */
export function routesPrincipes() {
  const os = implement(contrat.principes);
  return {
    listerGestesHumains: os.listerGestesHumains.handler(() => ({
      body: CATALOGUE_GESTES.map((g) => ({ ...g })),
      decalage: 0,
      total: CATALOGUE_GESTES.length,
    })),
  };
}
