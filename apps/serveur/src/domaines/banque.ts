import { implement } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import { creerServiceBanque } from '../../../../packages/contrat/src/domaines/banque-service.js';

type ServiceBanque = ReturnType<typeof creerServiceBanque>;

/** Routes de la banque (lecture seulement), branchées sur le service en mémoire. */
export function routesBanque(service: ServiceBanque = creerServiceBanque()) {
  const os = implement(contrat.banque);
  return {
    listerComptesBancaires: os.listerComptesBancaires.handler(() => service.comptes()),
    listerLignesBancaires: os.listerLignesBancaires.handler(({ input, errors }) => {
      const page = service.lignes(input.query);
      if (!page) throw errors.COMPTE_INCONNU();
      return page;
    }),
    lireCouvertureCompte: os.lireCouvertureCompte.handler(({ input, errors }) => {
      const c = service.couverture(input.params.compte);
      if (!c) throw errors.COMPTE_INCONNU();
      return c;
    }),
    listerTrousReleves: os.listerTrousReleves.handler(({ input }) => service.trous(input.query?.etat)),
    listerDemandes: os.listerDemandes.handler(({ input }) => service.demandes(input.query?.etat)),
    listerDoublons: os.listerDoublons.handler(({ input }) => service.doublons(input.query?.etat)),
    lireExplicationLigne: os.lireExplicationLigne.handler(({ input, errors }) => {
      const e = service.explication(input.params.ligne);
      if (!e) throw errors.LIGNE_INCONNUE();
      return e;
    }),
  };
}
