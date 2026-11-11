import { implement, ORPCError } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import { creerServiceFinContrat, type ResultatFinContrat } from '../../../../packages/contrat/src/domaines/fin-contrat-service.js';
import type { OptionsAbonnement } from './options-abonnement.js';

/** Fin de contrat et gel : service en mémoire, état propre à chaque serveur. Aucun effacement n'est exécuté. */
export function implementerFinContrat(os: ReturnType<typeof implement<typeof contrat>>, options: OptionsAbonnement) {
  const service = creerServiceFinContrat({ horloge: options.horloge ?? (() => new Date().toISOString()), scenario: options.scenario ?? null });
  const issue = (r: ResultatFinContrat, errors: Record<string, () => Error>) => {
    if (r.ok) return r.valeur;
    if (r.erreur === 'BAD_REQUEST' || r.erreur === 'INTERNAL_SERVER_ERROR') throw new ORPCError(r.erreur);
    throw (errors[r.erreur] as () => Error)();
  };
  return {
    lireFinContrat: os.finContrat.lireFinContrat.handler(() => service.lire()),
    accuserReception: os.finContrat.accuserReception.handler(({ input, errors }) => issue(service.accuser(input.headers['idempotency-key'], input.body), errors)),
    poserGel: os.finContrat.poserGel.handler(({ input, errors }) => issue(service.poserGel(input.headers['idempotency-key'], input.body), errors)),
    leverGel: os.finContrat.leverGel.handler(({ input, errors }) => issue(service.leverGel(input.headers['idempotency-key'], input.body), errors)),
  };
}
