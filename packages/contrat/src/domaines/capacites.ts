import { oc } from '@orpc/contract';
import { z } from 'zod';
import { cheminSociete } from '../prefixe-routes.js';

/** Une ligne par action : le serveur donne la raison et sa phrase, le front n'invente rien. */
export const Capacite = z.object({
  action: z.string().min(1),
  permis: z.boolean(),
  raison_code: z.string().min(1).optional(),
  raison_texte: z.string().min(1).optional(),
});
export type Capacite = z.infer<typeof Capacite>;

export const ReponseCapacites = z.object({ body: z.array(Capacite) });
export type ReponseCapacites = z.infer<typeof ReponseCapacites>;

/** Lecture seule, sans clé d'idempotence ; la personne vient de la session, jamais de la requête. */
export const lireCapacites = oc
  .route({ method: 'GET', path: cheminSociete('/moi/capacites') as `/${string}`, inputStructure: 'detailed', operationId: 'lireCapacites' })
  .errors({ NON_AUTHENTIFIE: { status: 401 } })
  .input(z.object({ params: z.object({ s: z.string().min(1) }) }))
  .output(ReponseCapacites);

export const capacites = { lireCapacites };
