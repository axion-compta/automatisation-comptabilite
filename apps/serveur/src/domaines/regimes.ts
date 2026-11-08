import { implement } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import { creerServiceRegimes } from '../../../../packages/contrat/src/domaines/regimes-service.js';

type ServiceRegimes = ReturnType<typeof creerServiceRegimes>;

/** Société fictive par défaut : Lemoine Rénovation. Lecture seule. */
export function routesRegimes(service: ServiceRegimes = creerServiceRegimes('soc-lemoine')) {
  const os = implement(contrat.regimes);
  return {
    listerRegimesTva: os.listerRegimesTva.handler(() => ({ body: service.listerTva() })),
    listerRegimesImposition: os.listerRegimesImposition.handler(() => ({ body: service.listerImposition() })),
  };
}
