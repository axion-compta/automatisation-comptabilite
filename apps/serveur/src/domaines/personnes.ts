import { implement } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import { creerServicePersonnes, ErreurPersonnes } from '../../../../packages/contrat/src/domaines/personnes-service.js';
import type { RegleConservation } from '../../../../packages/noyau/src/conservation/regles.js';
import type { OptionsExploitation } from './options-exploitation.js';
import { refusPersonnes, verifierAccesPersonnes } from './personnes-acces.js';
import type { TypeDroit } from '../../../../packages/noyau/src/rgpd/types.js';

/** Demandes des personnes : service en mémoire, une instance par `creerApp` ; sans `reglagesPersonnes`, 503 REGLAGE_ABSENT. */
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
  const controler = (errors: Record<string, () => Error>, typeDemande?: TypeDroit): void => {
    const v = verifierAccesPersonnes(options.identite?.lire(), { ...(typeDemande === undefined ? {} : { typeDemande }), maintenantMs: Date.parse(horloge()), reglages: options.reglagesConnexion });
    if (v.ok) return;
    throw v.code === 'REGLAGE_ABSENT' ? errors['REGLAGE_ABSENT']!() : refusPersonnes(v);
  };
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
    listerDemandes: os.personnes.listerDemandes.handler(({ errors }) => { controler(errors); return { body: appeler(errors, (s) => s.lister()) }; }),
    enregistrerDemande: os.personnes.enregistrerDemande.handler(({ input, errors }) => {
      controler(errors);
      return { body: appeler(errors, (s) => s.enregistrer(input.headers['idempotency-key'], input.body)) };
    }),
    traiterDemande: os.personnes.traiterDemande.handler(({ input, errors }) => {
      controler(errors); // permission d'abord : un refus ne révèle ni l'existence ni le type d'une demande
      const type = service?.lister().find((d) => d.id === input.params.id)?.type as TypeDroit | undefined;
      controler(errors, type);
      return { body: appeler(errors, (s) => s.traiter(input.headers['idempotency-key'], input.params.id, input.body as Parameters<typeof s.traiter>[2])) };
    }),
    rechercherPersonne: os.personnes.rechercherPersonne.handler(({ input, errors }) => {
      controler(errors);
      return { body: appeler(errors, (s) => s.rechercher(input.query as Parameters<typeof s.rechercher>[0])) };
    }),
  };
}
