import type { implement } from '@orpc/server';
import type { contrat } from '../../../../packages/contrat/src/routes.js';
import { creerServiceIndicateurs } from '../../../../packages/contrat/src/domaines/ventes-indicateurs-service.js';

/** Indicateurs du mois et suites de numéros (lecture seule), sur le service en mémoire. Régime non confirmé : aucun montant de TVA collectée. */
export function implementerVentesIndicateurs(os: ReturnType<typeof implement<typeof contrat>>) {
  const service = creerServiceIndicateurs();
  return {
    lireIndicateurs: os.ventesIndicateurs.lireIndicateurs.handler(({ input }) => ({
      body: service.lireIndicateurs(input.query.mois, input.query.avecPropositions === 'true'),
    })),
    listerSeries: os.ventesIndicateurs.listerSeries.handler(() => ({ body: service.listerSeries() })),
  };
}
