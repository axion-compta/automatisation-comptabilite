import { implement, ORPCError } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import type { OptionsAbonnement } from './options-abonnement.js';

const non = () => {
  throw new ORPCError('NOT_IMPLEMENTED');
};

/** Bouchons : répondent « non implémenté » (501) en attendant le domaine (L07-T20). */
export function implementerFinContrat(os: ReturnType<typeof implement<typeof contrat>>, options: OptionsAbonnement) {
  void options;
  const d = os.finContrat;
  return {
    lireFinContrat: d.lireFinContrat.handler(non),
    accuserReception: d.accuserReception.handler(non),
    poserGel: d.poserGel.handler(non),
    leverGel: d.leverGel.handler(non),
  };
}
