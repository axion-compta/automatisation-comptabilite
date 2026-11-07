import { implement, ORPCError } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import type { OptionsAbonnement } from './options-abonnement.js';

/** Bouchon : répond « non implémenté » (501) en attendant le domaine. */
export function implementerVolume(os: ReturnType<typeof implement<typeof contrat>>, options: OptionsAbonnement) {
  void options;
  return {
    lireVolume: os.abonnement.lireVolume.handler(() => {
      throw new ORPCError('NOT_IMPLEMENTED');
    }),
  };
}
