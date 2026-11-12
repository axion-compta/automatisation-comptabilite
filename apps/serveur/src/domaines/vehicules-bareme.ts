import { implement } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import { creerServiceVehiculesBareme, ErreurBareme } from '../../../../packages/contrat/src/domaines/vehicules-bareme-service.js';

/** Routes des véhicules et du barème au jour J (lecture), branchées sur le service en mémoire. */
export function routesVehiculesBareme(service: ReturnType<typeof creerServiceVehiculesBareme> = creerServiceVehiculesBareme()) {
  const os = implement(contrat.vehiculesBareme);
  return {
    listerVehicules: os.listerVehicules.handler(({ input }) => ({ body: service.lister(input.query.personne) })),
    lireBaremeIk: os.lireBaremeIk.handler(({ input, errors }) => {
      try {
        return { body: service.lire(input.query.date) };
      } catch (e) {
        if (e instanceof ErreurBareme) throw errors[e.code]();
        throw e;
      }
    }),
  };
}
