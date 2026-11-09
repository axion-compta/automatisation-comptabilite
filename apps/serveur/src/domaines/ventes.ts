import { implement, ORPCError } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';

/** Bouchon : le contrat est figé, le service réel viendra avec L10-T33. Signature sans paramètre, figée. */
export function routesVentes() {
  const os = implement(contrat.ventes);
  return {
    listerVentes: os.listerVentes.handler(() => {
      throw new ORPCError('NOT_IMPLEMENTED');
    }),
    lireVente: os.lireVente.handler(() => {
      throw new ORPCError('NOT_IMPLEMENTED');
    }),
  };
}
