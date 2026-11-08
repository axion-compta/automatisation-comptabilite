import { oc } from '@orpc/contract';
import { z } from 'zod';

export const GesteHumain = z.object({
  code: z.string().regex(/^G(0[1-9]|1[0-2])$/),
  action: z.string().min(1),
  permission: z.string().min(1),
  reauth: z.enum(['toujours', 'jamais', 'fusion_seulement']),
});
export type GesteHumain = z.infer<typeof GesteHumain>;

export const ReponseGestesHumains = z.object({
  body: z.array(GesteHumain),
  decalage: z.number().int().min(0),
  total: z.number().int().min(0),
});

/** Forme commune des indicateurs : un zéro n'est jamais servi sans donnée (état vide ou donnée manquante, valeur nulle). */
export const Indicateur = z.discriminatedUnion('etat', [
  z.object({ etat: z.literal('ok'), valeur: z.number().finite() }),
  z.object({ etat: z.literal('vide'), valeur: z.null(), raison: z.string().min(1) }),
  z.object({ etat: z.literal('donnee_manquante'), valeur: z.null(), raison: z.string().min(1) }),
]);
export type Indicateur = z.infer<typeof Indicateur>;

/** Liste fermée des 12 gestes humains (lecture seule). */
export const listerGestesHumains = oc
  .route({ method: 'GET', path: '/gestes-humains', inputStructure: 'detailed', operationId: 'listerGestesHumains' })
  .input(z.object({}))
  .output(ReponseGestesHumains);

export const principes = { listerGestesHumains };
