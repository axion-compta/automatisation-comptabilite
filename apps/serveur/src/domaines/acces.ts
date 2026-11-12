import { implement } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import { creerServiceAcces } from '../../../../packages/contrat/src/domaines/acces-service.js';
import type { OptionsAbonnement } from './options-abonnement.js';

/** Accès : état et bannière lus dans le service du contrat (scénario fictif). */
export function implementerAcces(os: ReturnType<typeof implement<typeof contrat>>, options: OptionsAbonnement) {
  const horloge = options.horloge ?? (() => new Date(Date.now()).toISOString());
  return {
    lireAcces: os.abonnement.lireAcces.handler(() => creerServiceAcces({ horloge, scenario: options.scenario ?? null }).lire()),
  };
}
