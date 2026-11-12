import { implement } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import { creerServiceAcceptations } from '../../../../packages/contrat/src/domaines/acceptations-service.js';
import type { OptionsAbonnement } from './options-abonnement.js';

/** Acceptations : service en mémoire, état propre à chaque serveur. */
export function implementerAcceptations(os: ReturnType<typeof implement<typeof contrat>>, options: OptionsAbonnement) {
  const service = creerServiceAcceptations({ horloge: options.horloge ?? (() => new Date().toISOString()), scenario: options.scenario ?? null });
  const d = os.acceptations;
  return {
    listerDocumentsAAccepter: d.listerDocumentsAAccepter.handler(() => ({ body: service.aAccepter() })),
    enregistrerAcceptation: d.enregistrerAcceptation.handler(({ input, errors }) => {
      const r = service.accepter(input.headers['idempotency-key'], input.body);
      if (r.ok) return r.valeur;
      throw errors[r.erreur]();
    }),
  };
}
