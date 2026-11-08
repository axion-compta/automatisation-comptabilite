import { implement } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import { creerServiceJuridique } from '../../../../packages/contrat/src/domaines/juridique-service.js';

type ServiceJuridique = ReturnType<typeof creerServiceJuridique>;

/** Société fictive par défaut : la SARL du jeu (SIREN fictif). Lecture seule. */
export function routesJuridique(service: ServiceJuridique = creerServiceJuridique('123456782')) {
  const os = implement(contrat.juridique);
  return {
    lireObligationsJuridiques: os.lireObligationsJuridiques.handler(({ input, errors }) => {
      const o = service.lire(input.params.exercice);
      if (!o) throw errors.EXERCICE_INCONNU();
      return { body: o };
    }),
  };
}
