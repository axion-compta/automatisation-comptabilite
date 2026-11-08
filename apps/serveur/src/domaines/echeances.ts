import { implement } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import { creerServiceEcheances, ErreurEcheances } from '../../../../packages/contrat/src/domaines/echeances-service.js';

type ServiceEcheances = ReturnType<typeof creerServiceEcheances>;

/** Lecture seule des échéances d'un intervalle ; `au` avant `du` répond 400. */
export function routesEcheances(service: ServiceEcheances = creerServiceEcheances()) {
  const os = implement(contrat.echeances);
  return {
    listerEcheances: os.listerEcheances.handler(({ input, errors }) => {
      try {
        return service.lister(input.query.du, input.query.au);
      } catch (e) {
        if (e instanceof ErreurEcheances) throw errors.ORDRE_INVERSE();
        throw e;
      }
    }),
  };
}
