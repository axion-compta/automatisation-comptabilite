import { oc } from '@orpc/contract';
import { z } from 'zod';

const Entier = z.number().int().min(0);

export const Volume = z.object({
  palier: z.object({ code: z.string(), nom_affiche: z.string() }),
  compris: Entier,
  utilise: Entier,
  prevision_fin_de_mois: Entier,
  seuils_bps: z.array(Entier),
  alertes_bps: z.array(Entier),
  depasse: z.boolean(),
  proposer_choix: z.boolean(),
  comportement: z.enum(['continuer', 'attente']),
  palier_superieur: z.object({ code: z.string(), nom_affiche: z.string(), pieces_par_mois: Entier }).nullable(),
});
export type Volume = z.infer<typeof Volume>;

/** Volume de pièces du mois. Aucun montant. */
export const lireVolume = oc
  .route({ method: 'GET', path: '/volume', inputStructure: 'detailed', operationId: 'lireVolume', tags: ['acces:lecture'] })
  .input(z.object({}))
  .output(Volume);

export const volume = { lireVolume };
