import { implement } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import { BornesInvalides, creerServiceFrais } from '../../../../packages/contrat/src/domaines/frais-service.js';

/** Routes des frais (lecture), branchées sur le service en mémoire. */
export function routesFrais(service: ReturnType<typeof creerServiceFrais> = creerServiceFrais()) {
  const os = implement(contrat.frais);
  return {
    listerFrais: os.listerFrais.handler(({ input, errors }) => {
      try {
        return service.lister(input.query);
      } catch (e) {
        if (e instanceof BornesInvalides) throw errors.BORNES_INVALIDES();
        throw e;
      }
    }),
    lireFrais: os.lireFrais.handler(({ input, errors }) => {
      const f = service.lire(input.params.id);
      if (!f) throw errors.FRAIS_INCONNU();
      return { body: f };
    }),
  };
}
