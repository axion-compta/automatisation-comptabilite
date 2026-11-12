import { oc } from '@orpc/contract';
import { z } from 'zod';

const Id = z.string().min(1);

/** Version du FEC produite et enregistrée. `telechargementAutorise` est faux hors statut définitif. */
export const FecProduit = z.strictObject({
  id: z.string(), exerciceId: z.string(), version: z.number().int().min(1),
  statut: z.enum(['travail', 'definitif', 'remplace']),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  nomFichier: z.string(), preparePar: z.string(), prepareLe: z.string(),
  resultatControles: z.enum(['ok', 'ecarts']),
  controles: z.array(z.strictObject({ regleId: z.string(), nombreEcarts: z.number().int().min(0) })),
  motif: z.string().nullable(), destinataire: z.string().nullable(),
  mention: z.literal('prepare_par_ia'),
  telechargementAutorise: z.boolean(),
});
export type FecProduit = z.infer<typeof FecProduit>;

export const ReponseHistoriqueFec = z.object({ body: z.array(FecProduit) });
export const ReponseFec = z.object({ body: FecProduit });

export const listerHistoriqueFec = oc
  .route({ method: 'GET', path: '/exercices/{exercice}/fec/historique', inputStructure: 'detailed', operationId: 'listerHistoriqueFec', tags: ['acces:lecture'] })
  .errors({ EXERCICE_INCONNU: { status: 404 } })
  .input(z.object({ params: z.object({ exercice: Id }) }))
  .output(ReponseHistoriqueFec);

export const lireFec = oc
  .route({ method: 'GET', path: '/fec/{fec}', inputStructure: 'detailed', operationId: 'lireFec', tags: ['acces:lecture'] })
  .errors({ FEC_INCONNU: { status: 404 } })
  .input(z.object({ params: z.object({ fec: Id }) }))
  .output(ReponseFec);

export const fec = { listerHistoriqueFec, lireFec };
