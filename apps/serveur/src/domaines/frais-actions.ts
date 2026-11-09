import { implement } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import { creerServiceFraisActions, ErreurActions } from '../../../../packages/contrat/src/domaines/frais-actions-service.js';

/** Routes d'écriture des frais (créer, compléter), sur le service en mémoire. `x-personne` : identité d'essai. */
export function routesFraisActions(service: ReturnType<typeof creerServiceFraisActions> = creerServiceFraisActions()) {
  const os = implement(contrat.fraisActions);
  const traduire = <T>(calcul: () => T, errors: Record<string, () => Error>): T => {
    try {
      return calcul();
    } catch (e) {
      const fabrique = e instanceof ErreurActions ? errors[e.code] : undefined;
      if (fabrique !== undefined) throw fabrique();
      throw e;
    }
  };
  return {
    creerFrais: os.creerFrais.handler(({ input: { body, headers: h }, errors }) => traduire(() => ({ body: service.creer(body, h['x-personne'], h['idempotency-key']) }), errors)),
    completerFrais: os.completerFrais.handler(({ input: { params, body, headers: h }, errors }) =>
      traduire(() => ({ body: service.completer(params.id, body, Number(h['if-match']), h['x-personne'], h['idempotency-key']) }), errors),
    ),
  };
}
