import { implement } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import { creerServiceSante } from '../../../../packages/contrat/src/domaines/sante-service.js';

type ServiceSante = ReturnType<typeof creerServiceSante>;

/** Lecture seule, aucune entrée : la société n'est pas un paramètre. */
export function routesSante(service: ServiceSante = creerServiceSante()) {
  const os = implement(contrat.sante);
  return { lireSante: os.lireSante.handler(() => ({ body: service.lire() })) };
}
