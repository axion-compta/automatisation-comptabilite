import { implement } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import { exigerSociete, type ContexteProfil } from './profil.js';
import { ErreurChamp, type ServiceProfilChamps } from '../../../../packages/contrat/src/domaines/profil-champs-service.js';

/** Écritures du profil sur le service en mémoire, partagé avec `GET /profil`. */
export function routesProfilChamps(service: ServiceProfilChamps, aujourdhui: () => string = () => new Date().toISOString().slice(0, 10)) {
  const os = implement(contrat.profilChamps).$context<ContexteProfil>();
  const appeler = <T>(errors: Record<string, (o?: object) => Error>, f: () => T): T => {
    try {
      return f();
    } catch (e) {
      if (e instanceof ErreurChamp) throw errors[e.code]!();
      throw e;
    }
  };
  return {
    ajouterValeurChamp: os.ajouterValeurChamp.handler(({ input, errors, context }) => (exigerSociete(context, input.params.s), { body: appeler(errors, () => service.ajouter(input.params.cle, input.headers['idempotency-key'], input.body, aujourdhui())) })),
    confirmerChamp: os.confirmerChamp.handler(({ input, errors, context }) => (exigerSociete(context, input.params.s), { body: appeler(errors, () => service.confirmer(input.params.cle, input.headers['idempotency-key'], input.body, aujourdhui())) })),
  };
}
