import { implement } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import { creerServiceTva, type ServiceTva } from '../../../../packages/contrat/src/domaines/tva-service.js';
import { creerServiceEcritureTva, implementerEcritureTva, type ServiceEcritureTva } from './tva-ecriture.js';

/** Routes de la TVA (lecture seule), branchées sur le service en mémoire. */
export function routesTva(service: ServiceTva = creerServiceTva(), ecriture: ServiceEcritureTva = creerServiceEcritureTva()) {
  const os = implement(contrat.tva);
  return {
    ...implementerEcritureTva(os, ecriture),
    listerPeriodesTva: os.listerPeriodesTva.handler(({ input, errors }) => {
      const r = service.periodes(input.params.exercice, input.query);
      if (!r) throw errors.EXERCICE_INCONNU();
      return r;
    }),
    lireEstimationTva: os.lireEstimationTva.handler(({ input, errors }) => {
      const e = service.estimation(input.params.exercice);
      if (!e) throw errors.EXERCICE_INCONNU();
      return { body: e };
    }),
    lireDeclarationTva: os.lireDeclarationTva.handler(({ input, errors }) => {
      const d = service.declaration(input.params.declaration);
      if (!d) throw errors.DECLARATION_INCONNUE();
      return { body: d };
    }),
  };
}
