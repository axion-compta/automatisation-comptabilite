import { implement } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import { SirenInvalide, creerServiceIdentite } from '../../../../packages/contrat/src/domaines/identite-service.js';
import { verifierTvaFrancaise } from '../../../../packages/noyau/src/profil/identifiants.js';

type ServiceIdentite = ReturnType<typeof creerServiceIdentite>;

/** Lecture seule, réponses fictives : aucun service externe réel. */
export function routesIdentite(service: ServiceIdentite = creerServiceIdentite()) {
  const os = implement(contrat.identite);
  return {
    lireSiren: os.lireSiren.handler(({ input, errors }) => {
      try {
        return { body: service.lireSiren(input.params.siren) };
      } catch (e) {
        if (e instanceof SirenInvalide) throw errors.SIREN_INVALIDE();
        throw e;
      }
    }),
    verifierTva: os.verifierTva.handler(({ input }) => ({
      body: service.verifierTva(input.params.numero, verifierTvaFrancaise(input.params.numero).valide),
    })),
  };
}
