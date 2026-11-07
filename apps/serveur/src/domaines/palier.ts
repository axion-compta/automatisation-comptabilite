import { implement, ORPCError } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import type { OptionsAbonnement } from './options-abonnement.js';

/** Bouchon : répond « non implémenté » (501) en attendant le domaine. */
export function implementerPalier(os: ReturnType<typeof implement<typeof contrat>>, options: OptionsAbonnement) {
  void options;
  return {
    demanderPalier: os.abonnement.demanderPalier.handler(() => {
      throw new ORPCError('NOT_IMPLEMENTED');
    }),
  };
}
