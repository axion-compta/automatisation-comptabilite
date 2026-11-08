import { oc } from '@orpc/contract';
import { z } from 'zod';

export const ResultatControle = z.enum(['OK', 'ALERTE', 'IMPOSSIBLE', 'NON_APPLICABLE', 'ECARTE']);
export type ResultatControle = z.infer<typeof ResultatControle>;

export const TraceControle = z.strictObject({
  regleId: z.string(), gravite: z.enum(['B', 'M', 'm', 'I']), objetType: z.string(), objetId: z.string(),
  resultat: ResultatControle, valeur: z.string().nullable(), ecartCentimes: z.number().int().nullable(), horodatage: z.string(),
});
export type TraceControle = z.infer<typeof TraceControle>;

export const ReponseTraces = z.object({ body: z.array(TraceControle), decalage: z.number().int().min(0), total: z.number().int().min(0) });

export const listerTraces = oc
  .route({ method: 'GET', path: '/exercices/{exercice}/controles', inputStructure: 'detailed', operationId: 'listerTraces', tags: ['acces:lecture'] })
  .errors({ EXERCICE_INCONNU: { status: 404 } })
  .input(
    z.object({
      params: z.object({ exercice: z.string().min(1) }),
      query: z.object({ resultat: ResultatControle.optional(), limite: z.coerce.number().int().min(1).max(100).optional(), decalage: z.coerce.number().int().min(0).optional() }).optional(),
    }),
  )
  .output(ReponseTraces);

export const controles = { listerTraces };
