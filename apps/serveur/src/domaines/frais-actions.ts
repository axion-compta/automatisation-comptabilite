import { implement } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import { exigerSociete, type ContexteProfil } from './profil.js';
import { creerServiceFraisActions, ErreurActions } from '../../../../packages/contrat/src/domaines/frais-actions-service.js';
import { creerBoiteEnvoiMemoire } from '../../../../packages/noyau/src/evenements/memoire.js';
import type { UniteDeTravail } from '../../../../packages/noyau/src/evenements/publication.js';
import { creerFraisActionsPublies, type ContexteFrais } from './frais-evenements.js';

const contexte = (societeId: string, personne: string, cle: string): ContexteFrais => ({
  societeId, acteur: { type: 'personne', id: personne }, canal: 'api', correlationId: cle, cleIdempotence: cle, horodatage: new Date().toISOString(),
});

/** Routes d'écriture des frais (créer, compléter), sur le service en mémoire. `x-personne` : identité d'essai. */
export function routesFraisActions(service: ReturnType<typeof creerServiceFraisActions> = creerServiceFraisActions(), unite: UniteDeTravail = creerBoiteEnvoiMemoire()) {
  const publies = creerFraisActionsPublies(service, unite);
  const os = implement(contrat.fraisActions).$context<ContexteProfil>();
  const traduire = async <T>(calcul: () => Promise<T>, errors: Record<string, () => Error>): Promise<T> => {
    try {
      return await calcul();
    } catch (e) {
      const fabrique = e instanceof ErreurActions ? errors[e.code] : undefined;
      if (fabrique !== undefined) throw fabrique();
      throw e;
    }
  };
  return {
    creerFrais: os.creerFrais.handler(({ input: { params, body, headers: h }, errors, context }) => traduire(async () => (exigerSociete(context, params.s), { body: await publies.creer(contexte(params.s, h['x-personne'], h['idempotency-key']), body) }), errors)),
    completerFrais: os.completerFrais.handler(({ input: { params, body, headers: h }, errors, context }) =>
      traduire(async () => (exigerSociete(context, params.s), { body: await publies.completer(contexte(params.s, h['x-personne'], h['idempotency-key']), params.id, body, Number(h['if-match'])) }), errors),
    ),
  };
}
