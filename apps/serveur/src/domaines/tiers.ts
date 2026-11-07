import { implement } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import { creerServiceTiers } from '../../../../packages/contrat/src/domaines/tiers-service.js';

type ServiceTiers = ReturnType<typeof creerServiceTiers>;

/** Routes des tiers (lecture), branchées sur le service en mémoire. */
export function routesTiers(service: ServiceTiers = creerServiceTiers()) {
  const os = implement(contrat.tiers);
  return {
    listerTiers: os.listerTiers.handler(({ input }) => service.lister(input.query)),
  };
}
