import { implement } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import { creerServiceParametres } from '../../../../packages/contrat/src/domaines/parametres-service.js';

type ServiceParametres = ReturnType<typeof creerServiceParametres>;

/** Lecture seule sur les paramètres inventés ; absent à la date = 404, sans valeur de repli. */
export function routesParametres(service: ServiceParametres = creerServiceParametres()) {
  const os = implement(contrat.parametres);
  return {
    lireParametre: os.lireParametre.handler(({ input, errors }) => {
      const { cle, date } = input.query;
      const p = service.lire(cle, date);
      if (!p) throw errors.PARAMETRE_ABSENT({ data: { cle, date } });
      return { body: p };
    }),
  };
}
