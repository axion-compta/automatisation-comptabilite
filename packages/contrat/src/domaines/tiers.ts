import { oc } from '@orpc/contract';
import { z } from 'zod';
import { enveloppe } from './plan.js';

export const Tiers = z.object({
  code: z.string(),
  nom: z.string(),
  type: z.enum(['client', 'fournisseur']),
  email: z.string(),
});
export type Tiers = z.infer<typeof Tiers>;

export const ReponseTiers = enveloppe(Tiers);

/** Liste des clients et fournisseurs, triés par code. Un code n'est jamais réutilisé. */
export const listerTiers = oc
  .route({ method: 'GET', path: '/tiers', inputStructure: 'detailed', operationId: 'listerTiers' })
  .input(
    z.object({
      query: z
        .object({
          type: z.enum(['client', 'fournisseur']).optional(),
          q: z.string().max(50).optional(),
          limite: z.coerce.number().int().min(1).max(100).optional(),
          decalage: z.coerce.number().int().min(0).optional(),
        })
        .optional(),
    }),
  )
  .output(ReponseTiers);

export const tiers = { listerTiers };
