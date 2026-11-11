import { oc } from '@orpc/contract';
import { z } from 'zod';

const Centimes = z.number().int();

export const Indicateur = z.object({ montantCentimes: Centimes, pieces: z.array(z.string().min(1)) });
export type Indicateur = z.infer<typeof Indicateur>;

export const Indicateurs = z.object({
  chiffreAffaires: Indicateur,
  aEncaisser: Indicateur,
  enRetard: Indicateur.extend({ clients: z.number().int().min(0) }),
  tvaCollectee: z.union([Indicateur, z.object({ nonCalculee: z.literal('regime_a_confirmer') })]),
  tvaEnAttente: Indicateur,
  provisoire: z.boolean(),
});
export type Indicateurs = z.infer<typeof Indicateurs>;

export const Serie = z.object({
  serie: z.string(),
  dernierOrdreVu: z.number().int().nullable(),
  trous: z.array(z.number().int()),
  tropDeTrous: z.boolean(),
  doublons: z.array(z.object({ ordre: z.number().int(), ids: z.array(z.string().min(1)) })),
  datesQuiReculent: z.array(z.object({ avant: z.string().min(1), apres: z.string().min(1) })),
});
export type Serie = z.infer<typeof Serie>;

/** Mois obligatoire (AAAA-MM) ; `avecPropositions` s'écrit « true » ou « false ». */
export const QueryIndicateurs = z.object({
  mois: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  avecPropositions: z.enum(['true', 'false']).optional(),
});

/** Lecture seule : aucune création, numérotation ni envoi de facture. */
export const lireIndicateurs = oc
  .route({ method: 'GET', path: '/ventes/indicateurs', inputStructure: 'detailed', operationId: 'lireIndicateurs' })
  .input(z.object({ query: QueryIndicateurs }))
  .output(z.object({ body: Indicateurs }));

export const listerSeries = oc
  .route({ method: 'GET', path: '/ventes/series', inputStructure: 'detailed', operationId: 'listerSeries' })
  .input(z.object({}))
  .output(z.object({ body: z.array(Serie) }));

export const ventesIndicateurs = { lireIndicateurs, listerSeries };
