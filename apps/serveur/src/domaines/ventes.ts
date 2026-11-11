import { implement } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import { creerServiceVentes } from '../../../../packages/contrat/src/domaines/ventes-service.js';

/** Routes des ventes (lecture seule), branchées sur le service en mémoire. Signature sans paramètre, figée par L10-T56. */
export function routesVentes() {
  const os = implement(contrat.ventes);
  const service = creerServiceVentes();
  return {
    listerVentes: os.listerVentes.handler(({ input }) => service.lister(input.query)),
    lireVente: os.lireVente.handler(({ input, errors }) => {
      const v = service.lire(input.params.id);
      if (!v) throw errors.VENTE_INCONNUE();
      return { body: v };
    }),
  };
}
