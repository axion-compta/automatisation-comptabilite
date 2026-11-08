import { implement } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import { creerServiceBloquants, type ServiceBloquants } from '../../../../packages/contrat/src/domaines/bloquants-service.js';

/** Lecture seule des contrôles bloquants avant une action, sur le service en mémoire. */
export function routesBloquants(service: ServiceBloquants = creerServiceBloquants()) {
  const os = implement(contrat.bloquants);
  return { listerBloquants: os.listerBloquants.handler(({ input }) => ({ body: service.lister(input.query.action) })) };
}
