import { oc } from '@orpc/contract';
import { z } from 'zod';

/** Actions gardées par un contrôle bloquant (B). Ajout seul, jamais de renommage. */
export const ACTIONS_GARDEES = ['validation', 'tva', 'export', 'cloture'] as const;
export const ActionGardee = z.enum(ACTIONS_GARDEES);
export type ActionGardee = z.infer<typeof ActionGardee>;

/** Même forme que chaque entrée du refus 409 : `messageCode` est un code, la phrase est dans `packages/textes`. */
export const Bloquant = z.strictObject({ regleId: z.string().min(1), objetId: z.string().min(1), messageCode: z.string().min(1) });
export type Bloquant = z.infer<typeof Bloquant>;

export const ReponseBloquants = z.strictObject({ autorise: z.boolean(), bloquants: z.array(Bloquant) });
export type ReponseBloquants = z.infer<typeof ReponseBloquants>;

/** Liste des B ouverts avant l'action, pour l'écran. Lecture seule ; la société n'est pas un paramètre. */
export const listerBloquants = oc
  .route({ method: 'GET', path: '/controles/bloquants', inputStructure: 'detailed', operationId: 'listerBloquants', tags: ['acces:lecture'] })
  .input(z.object({ query: z.strictObject({ action: ActionGardee }) }))
  .output(z.object({ body: ReponseBloquants }));

export const bloquants = { listerBloquants };
