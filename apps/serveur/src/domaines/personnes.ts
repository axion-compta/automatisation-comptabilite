import { implement } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import { creerServicePersonnes, ErreurPersonnes } from '../../../../packages/contrat/src/domaines/personnes-service.js';
import type { RegleConservation } from '../../../../packages/noyau/src/conservation/regles.js';
import type { OptionsExploitation } from './options-exploitation.js';

/**
 * Demandes des personnes : le service du contrat, en mémoire, une instance par `creerApp`.
 * Sans `reglagesPersonnes` (aucune valeur légale par défaut), le service n'est pas créé et chaque route répond 503 REGLAGE_ABSENT.
 */
export function implementerPersonnes(os: ReturnType<typeof implement<typeof contrat>>, options: OptionsExploitation) {
  const horloge = options.horloge ?? (() => new Date().toISOString());
  const reglages = options.reglagesPersonnes;
  const service = reglages === undefined ? null : creerServicePersonnes({
    horloge,
    dateReference: options.dateReference ?? horloge().slice(0, 10),
    moisReponse: reglages.moisReponse,
    joursRappel: reglages.joursRappel,
    regles: (options.reglesConservation ?? []) as readonly RegleConservation[],
  });
  /** Exécute l'appel ; une erreur du service devient l'erreur déclarée au contrat du même code. */
  const appeler = <T>(errors: Record<string, () => Error>, f: (s: NonNullable<typeof service>) => T): T => {
    if (service === null) throw errors['REGLAGE_ABSENT']!();
    try {
      return f(service);
    } catch (e) {
      if (e instanceof ErreurPersonnes && errors[e.code] !== undefined) throw errors[e.code]!();
      throw e;
    }
  };
  return {
    listerDemandes: os.personnes.listerDemandes.handler(({ errors }) => ({ body: appeler(errors, (s) => s.lister()) })),
    enregistrerDemande: os.personnes.enregistrerDemande.handler(({ input, errors }) => ({
      body: appeler(errors, (s) => s.enregistrer(input.headers['idempotency-key'], input.body)),
    })),
    traiterDemande: os.personnes.traiterDemande.handler(({ input, errors }) => ({
      body: appeler(errors, (s) => s.traiter(input.headers['idempotency-key'], input.params.id, input.body)),
    })),
    rechercherPersonne: os.personnes.rechercherPersonne.handler(({ input, errors }) => ({
      body: appeler(errors, (s) => s.rechercher(input.query)),
    })),
  };
}
