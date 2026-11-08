import { implement } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import { creerServiceTresorerie } from '../../../../packages/contrat/src/domaines/tresorerie-service.js';

const HORIZON_DEFAUT = 30;

/** Routes de trésorerie (lecture), branchées sur le service en mémoire. */
export function routesTresorerie(service: ReturnType<typeof creerServiceTresorerie> = creerServiceTresorerie()) {
  const os = implement(contrat.tresorerie);
  return {
    lirePrevision: os.lirePrevision.handler(({ input }) => service.prevision(input.query?.horizon ?? HORIZON_DEFAUT, input.query?.scenario ?? 'central')),
    listerFlux: os.listerFlux.handler(({ input }) => service.flux(input.query)),
  };
}

/** Routes des fournisseurs à payer et des alertes IBAN (lecture seule). */
export function routesFournisseurs(service: ReturnType<typeof creerServiceTresorerie> = creerServiceTresorerie()) {
  const os = implement(contrat.fournisseurs);
  return {
    listerEcheancesFournisseurs: os.listerEcheancesFournisseurs.handler(({ input }) => service.echeances(input.query?.horizon)),
    listerAlertesIban: os.listerAlertesIban.handler(() => service.alertesIban()),
  };
}
