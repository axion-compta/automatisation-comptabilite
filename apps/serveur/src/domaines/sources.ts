import { implement } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import { creerServiceSources } from '../../../../packages/contrat/src/domaines/sources-service.js';

type ServiceSources = ReturnType<typeof creerServiceSources>;

/** Lecture seule de l'état de la veille et des connecteurs. */
export function routesSources(service: ServiceSources = creerServiceSources()) {
  const os = implement(contrat.sources);
  return { lireEtatSources: os.lireEtatSources.handler(() => ({ body: service.lire() })) };
}
