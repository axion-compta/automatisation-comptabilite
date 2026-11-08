import { implement } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import { creerServiceFec, type ServiceFec } from '../../../../packages/contrat/src/domaines/fec-service.js';
import { creerServiceControles, type ServiceControles } from '../../../../packages/contrat/src/domaines/controles-service.js';

/** Routes du FEC et des contrôles tracés (lecture seule), branchées sur les services en mémoire. */
export function routesFec(service: ServiceFec = creerServiceFec()) {
  const os = implement(contrat.fec);
  return {
    listerHistoriqueFec: os.listerHistoriqueFec.handler(({ input, errors }) => ({ body: service.historique(input.params.exercice) ?? ((): never => { throw errors.EXERCICE_INCONNU(); })() })),
    lireFec: os.lireFec.handler(({ input, errors }) => ({ body: service.lire(input.params.fec) ?? ((): never => { throw errors.FEC_INCONNU(); })() })),
  };
}

export function routesControles(service: ServiceControles = creerServiceControles()) {
  const os = implement(contrat.controles);
  return {
    listerTraces: os.listerTraces.handler(({ input, errors }) => {
      const r = service.lister(input.params.exercice, input.query);
      if (!r) throw errors.EXERCICE_INCONNU();
      return r;
    }),
  };
}
