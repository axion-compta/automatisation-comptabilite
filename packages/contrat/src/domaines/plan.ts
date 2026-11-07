import { oc } from '@orpc/contract';
import { z } from 'zod';

export const Exercice = z.object({
  id: z.string(),
  libelle: z.string(),
  debut: z.string(),
  fin: z.string(),
  statut: z.enum(['ouvert', 'cloture']),
});
export type Exercice = z.infer<typeof Exercice>;

export const CompteDuPlan = z.object({
  numero: z.string(),
  libelle: z.string(),
  classe: z.number().int().min(1).max(7),
  soldeCentimes: z.number().int(),
});
export type CompteDuPlan = z.infer<typeof CompteDuPlan>;

const enveloppe = <T extends z.ZodType>(corps: T) =>
  z.object({ body: z.array(corps), decalage: z.number().int().min(0), total: z.number().int().min(0) });

/** Liste des exercices, du plus récent au plus ancien. */
export const listerExercices = oc
  .route({ method: 'GET', path: '/exercices', inputStructure: 'detailed', operationId: 'listerExercices' })
  .input(z.object({}))
  .output(enveloppe(Exercice));

/** Plan comptable d'un exercice avec le solde de la balance (débits moins crédits des écritures validées). */
export const listerPlan = oc
  .route({ method: 'GET', path: '/exercices/{exercice}/plan', inputStructure: 'detailed', operationId: 'listerPlan' })
  .errors({ EXERCICE_INCONNU: { status: 404 } })
  .input(
    z.object({
      params: z.object({ exercice: z.string().min(1) }),
      query: z
        .object({
          classe: z.coerce.number().int().min(1).max(7).optional(),
          q: z.string().max(50).optional(),
          limite: z.coerce.number().int().min(1).max(100).optional(),
          decalage: z.coerce.number().int().min(0).optional(),
        })
        .optional(),
    }),
  )
  .output(enveloppe(CompteDuPlan));

export const plan = { listerExercices, listerPlan };
