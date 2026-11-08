import { implement, ORPCError } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import type { OptionsExploitation } from './options-exploitation.js';

/** Bouchon : répond « non implémenté » (501) en attendant les domaines (L08-T36, L08-T37). Signature figée. */
export function implementerPersonnes(os: ReturnType<typeof implement<typeof contrat>>, options: OptionsExploitation) {
  void options;
  const bouchon = () => {
    throw new ORPCError('NOT_IMPLEMENTED');
  };
  return {
    listerDemandes: os.personnes.listerDemandes.handler(bouchon),
    enregistrerDemande: os.personnes.enregistrerDemande.handler(bouchon),
    traiterDemande: os.personnes.traiterDemande.handler(bouchon),
  };
}
