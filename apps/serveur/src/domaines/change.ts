import { implement } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import { creerServiceChange, type ServiceChange } from '../../../../packages/contrat/src/domaines/change-service.js';

/** Explication d'un écart de change (lecture seule), même route pour l'écran et pour le chat. */
export function routesChange(service: ServiceChange = creerServiceChange()) {
  const os = implement(contrat.change);
  return {
    expliquerEcartChange: os.expliquerEcartChange.handler(({ input, errors }) => {
      const e = service.expliquer(input.params.id);
      if (!e) throw errors.ECART_INCONNU();
      return { body: e };
    }),
  };
}
