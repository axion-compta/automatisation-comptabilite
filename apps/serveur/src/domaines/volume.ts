import { implement } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import { creerServiceVolume } from '../../../../packages/contrat/src/domaines/volume-service.js';
import type { OptionsAbonnement } from './options-abonnement.js';

/** Volume : lu dans le service du contrat (scénario fictif), le même que celui du faux serveur. */
export function implementerVolume(os: ReturnType<typeof implement<typeof contrat>>, options: OptionsAbonnement) {
  const horloge = options.horloge ?? (() => new Date().toISOString());
  return {
    lireVolume: os.abonnement.lireVolume.handler(() => creerServiceVolume({ horloge, scenario: options.scenario ?? null }).lire()),
  };
}
