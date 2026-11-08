import { implement } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import { creerServiceAlertes, type ServiceAlertesComplet } from '../../../../packages/contrat/src/domaines/alertes-service.js';

/** Le branchement commun (app.ts) passe `{}` par défaut : dans ce cas, un service en mémoire neuf est créé. */
export type ServiceAlertes = Partial<ServiceAlertesComplet>;

/** Routes des alertes et des compteurs (lecture), branchées sur le service en mémoire. */
export function routesAlertes(fourni: ServiceAlertes = {}) {
  const service = typeof fourni.lister === 'function' && typeof fourni.compteurs === 'function' && typeof fourni.exerciceConnu === 'function' ? (fourni as ServiceAlertesComplet) : creerServiceAlertes();
  const os = implement(contrat.alertes);
  return {
    listerAlertes: os.listerAlertes.handler(({ input, errors }) => {
      if (!service.exerciceConnu(input.params.exercice)) throw errors.EXERCICE_INCONNU();
      const q = input.query;
      return service.lister({ etat: q?.etat, entree: q?.entree, limite: q?.limite, decalage: q?.decalage });
    }),
    lireCompteurs: os.lireCompteurs.handler(({ input, errors }) => {
      if (!service.exerciceConnu(input.params.exercice)) throw errors.EXERCICE_INCONNU();
      return service.compteurs();
    }),
  };
}
