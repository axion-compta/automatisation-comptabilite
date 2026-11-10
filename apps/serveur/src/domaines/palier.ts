import { implement } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import { creerServicePalier } from '../../../../packages/contrat/src/domaines/palier-service.js';
import type { OptionsAbonnement } from './options-abonnement.js';

/** Demande de palier : service en mémoire, état propre à chaque serveur. */
export function implementerPalier(os: ReturnType<typeof implement<typeof contrat>>, options: OptionsAbonnement) {
  const service = creerServicePalier({ horloge: options.horloge ?? (() => new Date().toISOString()), scenario: options.scenario ?? null });
  return {
    demanderPalier: os.abonnement.demanderPalier.handler(({ input, errors }) => {
      const r = service.demander(input.headers['idempotency-key'], input.body);
      if (r.ok) return r.valeur;
      throw errors[r.erreur]();
    }),
  };
}
