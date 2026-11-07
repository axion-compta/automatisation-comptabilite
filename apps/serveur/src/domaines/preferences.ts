import { implement } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import {
  creerServicePreferences,
  ErreurPreference,
  ErreurUsage,
  type ServicePreferences as ServiceComplet,
} from '../../../../packages/contrat/src/domaines/preferences-service.js';

/** Le branchement commun (app.ts) passe `{}` par défaut : dans ce cas, un service en mémoire neuf est créé. */
export type ServicePreferences = Partial<ServiceComplet>;

/** Routes des préférences et de la mesure d'usage, branchées sur le service en mémoire. */
export function routesPreferences(fourni: ServicePreferences = {}) {
  const service = fourni.lire ? (fourni as ServiceComplet) : creerServicePreferences();
  const os = implement(contrat.preferences);
  return {
    lirePreferences: os.lirePreferences.handler(({ input }) => service.lire(input.query?.appareil)),
    ecrirePreference: os.ecrirePreference.handler(({ input, errors }) => {
      try {
        return service.ecrire(input.params.cle, input.body, input.headers['idempotency-key']);
      } catch (e) {
        if (e instanceof ErreurPreference) {
          throw e.code === 'format_fixe' ? errors.FORMAT_FIXE() : errors.PREFERENCE_INVALIDE();
        }
        throw e;
      }
    }),
    mesurerUsage: os.mesurerUsage.handler(({ input, errors }) => {
      try {
        service.enregistrerUsage(input.body.evenements, input.headers['idempotency-key']);
      } catch (e) {
        if (e instanceof ErreurUsage) throw errors.CHAMP_INCONNU();
        throw e;
      }
      return {};
    }),
  };
}
