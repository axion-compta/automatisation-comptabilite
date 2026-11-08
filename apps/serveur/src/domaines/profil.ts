import { implement } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import { creerServiceProfil } from '../../../../packages/contrat/src/domaines/profil-service.js';

type ServiceProfil = ReturnType<typeof creerServiceProfil>;

/** Société fictive par défaut : Lemoine Rénovation. La date du jour est lue ici, jamais dans le service. */
export function routesProfil(service: ServiceProfil = creerServiceProfil('soc-lemoine'), aujourdhui: () => string = () => new Date().toISOString().slice(0, 10)) {
  const os = implement(contrat.profil);
  return {
    lireProfil: os.lireProfil.handler(({ input }) => ({ body: service.lire(input.query?.au, aujourdhui()) })),
  };
}
