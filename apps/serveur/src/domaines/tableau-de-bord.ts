import { implement } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import { creerServiceTableauDeBord } from '../../../../packages/contrat/src/domaines/tableau-de-bord-service.js';

type ServiceComplet = ReturnType<typeof creerServiceTableauDeBord>;
export type ServiceTableauDeBord = Partial<ServiceComplet>;

/** Routes du tableau de bord (lecture), branchées sur le service en mémoire. */
export function routesTableauDeBord(entree?: ServiceTableauDeBord) {
  const service = typeof entree?.lire === 'function' && typeof entree.lireBloc === 'function' ? (entree as ServiceComplet) : creerServiceTableauDeBord();
  const os = implement(contrat.tableauDeBord);
  return {
    lireTableauDeBord: os.lireTableauDeBord.handler(({ input, errors }) => {
      const r = service.lire(input.params.exercice, input.query);
      if (!r) throw errors.EXERCICE_INCONNU();
      return { body: r };
    }),
    lireBloc: os.lireBloc.handler(({ input, errors }) => {
      const r = service.lireBloc(input.params.exercice, input.params.bloc, input.query);
      if (!r) throw errors.EXERCICE_INCONNU();
      if (r === 'bloc_inconnu') throw errors.BLOC_INCONNU();
      return { body: r };
    }),
  };
}
