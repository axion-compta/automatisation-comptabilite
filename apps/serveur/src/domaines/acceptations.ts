import { implement, ORPCError } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import type { OptionsAbonnement } from './options-abonnement.js';

const non = () => {
  throw new ORPCError('NOT_IMPLEMENTED');
};

/** Bouchons : répondent « non implémenté » (501) en attendant le domaine (L07-T21). */
export function implementerAcceptations(os: ReturnType<typeof implement<typeof contrat>>, options: OptionsAbonnement) {
  void options;
  const d = os.acceptations;
  return {
    listerDocumentsAAccepter: d.listerDocumentsAAccepter.handler(non),
    enregistrerAcceptation: d.enregistrerAcceptation.handler(non),
  };
}
