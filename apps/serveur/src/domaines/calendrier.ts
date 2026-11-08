import { implement } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import { creerServiceCalendrier } from '../../../../packages/contrat/src/domaines/calendrier-service.js';
import { ErreurCalendrier } from '../../../../packages/noyau/src/alertes/calendrier.js';

type ServiceComplet = ReturnType<typeof creerServiceCalendrier>;
export type ServiceCalendrier = Partial<ServiceComplet>;

/** Routes du calendrier et du vocabulaire (lecture), branchées sur le service en mémoire. */
export function routesCalendrier(entree?: ServiceCalendrier) {
  const service = typeof entree?.lire === 'function' && typeof entree.vocabulaire === 'function' ? (entree as ServiceComplet) : creerServiceCalendrier();
  const os = implement(contrat.calendrier);
  return {
    lireCalendrier: os.lireCalendrier.handler(({ input, errors }) => {
      try {
        const r = service.lire(input.params.exercice, input.query.du, input.query.au);
        if (!r) throw errors.EXERCICE_INCONNU();
        return { body: r };
      } catch (e) {
        if (e instanceof ErreurCalendrier && e.code === 'ordre_inverse') throw errors.ORDRE_INVERSE();
        throw e;
      }
    }),
    lireVocabulaire: os.lireVocabulaire.handler(({ input }) => ({ body: service.vocabulaire(input.query.mode) })),
  };
}
