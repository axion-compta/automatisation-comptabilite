import { oc } from '@orpc/contract';
import { z } from 'zod';

/** Premier niveau : aucun numéro de compte, aucun pourcentage de confiance. */
export const TauxSource = z.strictObject({
  tauxE8: z.number().int().positive(),
  source: z.string().min(1),
  date: z.string().min(1),
});
export type TauxSource = z.infer<typeof TauxSource>;

export const ExplicationEcart = z.strictObject({
  sens: z.enum(['gain', 'perte', 'aucun']),
  montantCentimes: z.number().int().min(0),
  devise: z.string().min(1),
  taux: z.tuple([TauxSource, TauxSource]),
  phrase: z.string().min(1),
});
export type ExplicationEcart = z.infer<typeof ExplicationEcart>;

export const ReponseExplicationEcart = z.object({ body: ExplicationEcart });

export const expliquerEcartChange = oc
  .route({ method: 'GET', path: '/ecarts-change/{id}/explication', inputStructure: 'detailed', operationId: 'expliquerEcartChange', tags: ['acces:lecture'] })
  .errors({ ECART_INCONNU: { status: 404 } })
  .input(z.object({ params: z.object({ id: z.string().min(1) }) }))
  .output(ReponseExplicationEcart);

export const change = { expliquerEcartChange };
