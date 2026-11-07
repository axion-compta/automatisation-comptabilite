import { implement } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import { creerServicePlan } from '../../../../packages/contrat/src/domaines/plan-service.js';

type ServicePlan = ReturnType<typeof creerServicePlan>;

/** Routes du plan comptable, branchées sur le service en mémoire. */
export function routesPlan(service: ServicePlan = creerServicePlan()) {
  const os = implement(contrat.plan);
  return {
    listerExercices: os.listerExercices.handler(() => service.exercices()),
    listerPlan: os.listerPlan.handler(({ input, errors }) => {
      const page = service.plan(input.params.exercice, input.query);
      if (!page) throw errors.EXERCICE_INCONNU();
      return page;
    }),
  };
}
