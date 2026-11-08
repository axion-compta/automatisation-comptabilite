import { implement } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import { creerServiceRecherche } from '../../../../packages/contrat/src/domaines/recherche-service.js';

type ServiceComplet = ReturnType<typeof creerServiceRecherche>;
export type ServiceRecherche = Partial<ServiceComplet>;

/** Route de recherche globale (lecture en POST), branchée sur le service en mémoire. Le texte n'est jamais journalisé. */
export function routesRecherche(entree?: ServiceRecherche) {
  const service = typeof entree?.chercher === 'function' ? (entree as ServiceComplet) : creerServiceRecherche();
  const os = implement(contrat.recherche);
  return {
    chercher: os.chercher.handler(({ input, errors }) => {
      const r = service.chercher(input.body);
      if ('erreur' in r) throw r.erreur === 'curseur_invalide' ? errors.CURSEUR_INVALIDE() : errors.REQUETE_INVALIDE();
      return { body: r };
    }),
  };
}
