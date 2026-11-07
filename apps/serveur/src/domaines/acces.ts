import { implement, ORPCError } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import type { OptionsAbonnement } from './options-abonnement.js';

/** Bouchon : répond « non implémenté » (501) en attendant le domaine. */
export function implementerAcces(os: ReturnType<typeof implement<typeof contrat>>, options: OptionsAbonnement) {
  void options;
  return {
    lireAcces: os.abonnement.lireAcces.handler(() => {
      throw new ORPCError('NOT_IMPLEMENTED');
    }),
  };
}
