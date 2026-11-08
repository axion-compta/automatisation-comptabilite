import { oc } from '@orpc/contract';
import { z } from 'zod';
import { EnTeteEcriture } from '../schemas.js';

export const FORMATS_EXPORT = ['xlsx', 'csv'] as const;

/** Corps strict : tout champ en plus (dont `societe_id`) est refusé, une seule société par session. */
export const DemandeExport = z.strictObject({
  liste: z.string().min(1),
  format: z.enum(FORMATS_EXPORT),
  filtres: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  tri: z.string().min(1).optional(),
});
export type DemandeExport = z.infer<typeof DemandeExport>;

export const ReponseExport = z.object({
  body: z.strictObject({
    nom: z.string().min(1),
    typeContenu: z.string().min(1),
    octetsBase64: z.string(),
    nbLignes: z.number().int().min(0),
    empreinte: z.string().regex(/^[0-9a-f]{64}$/),
  }),
});

/** Export d'une liste du contrat : mêmes lignes que l'écran, totaux étiquetés. Jamais envoyé à un tiers. */
export const exporter = oc
  .route({ method: 'POST', path: '/exports', inputStructure: 'detailed', operationId: 'exporter', tags: ['acces:export'] })
  .errors({ LISTE_NON_EXPORTABLE: { status: 404 }, FILTRE_INVALIDE: { status: 400 }, EXPORT_TROP_GROS: { status: 413 }, EXPORT_EN_TACHE_A_VENIR: { status: 501 } })
  .input(z.object({ headers: EnTeteEcriture, body: DemandeExport }))
  .output(ReponseExport);

export const exports = { exporter };
