import { oc } from '@orpc/contract';
import { z } from 'zod';

const DateJour = z.iso.date();

/** Paramètre daté tel que lu par l'écran : jamais de valeur de repli, la source et la date de relevé restent visibles. */
export const ParametreLu = z.object({
  cle: z.string().min(1),
  valeur: z.string(),
  statut: z.string().min(1),
  effetDebut: DateJour,
  effetFin: DateJour.nullable(),
  source: z.object({ url: z.string().min(1), titre: z.string().min(1), maj: DateJour.nullable() }),
  dateReleve: DateJour,
  aVerifier: z.boolean(),
});
export type ParametreLu = z.infer<typeof ParametreLu>;
export const ReponseParametre = z.object({ body: ParametreLu });

export const QueryParametre = z.object({ cle: z.string().regex(/^[a-z0-9_.]{1,100}$/), date: DateJour }).strict();

/** Absent à la date = 404 PARAMETRE_ABSENT, sans valeur dans le corps. */
export const lireParametre = oc
  .route({ method: 'GET', path: '/parametres', inputStructure: 'detailed', operationId: 'lireParametre' })
  .errors({ PARAMETRE_ABSENT: { status: 404, data: z.object({ cle: z.string(), date: DateJour }) } })
  .input(z.object({ query: QueryParametre }))
  .output(ReponseParametre);

export const parametres = { lireParametre };
