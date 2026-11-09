import { implement } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import { ErreurChangement, type ServiceProfilChangements } from '../../../../packages/contrat/src/domaines/profil-changements-service.js';

/** Aperçu puis confirmation sur le service en mémoire ; la réauthentification viendra avec L09-T49. */
export function routesProfilChangements(service: ServiceProfilChangements, aujourdhui: () => string = () => new Date().toISOString().slice(0, 10)) {
  const os = implement(contrat.profilChangements);
  const appeler = <T>(errors: Record<string, (o?: object) => Error>, f: () => T): T => {
    try {
      return f();
    } catch (e) {
      if (e instanceof ErreurChangement) throw errors[e.code]!();
      throw e;
    }
  };
  return {
    apercuChangement: os.apercuChangement.handler(({ input, errors }) => ({ body: appeler(errors, () => service.apercu(input.body, aujourdhui())) })),
    confirmerChangement: os.confirmerChangement.handler(({ input, errors }) => ({ body: appeler(errors, () => service.confirmer(input.body.apercuId, input.headers['idempotency-key'], aujourdhui())) })),
  };
}
