import { oc } from '@orpc/contract';
import { z } from 'zod';
import { EnTeteEcriture } from '../schemas.js';

export const DemandePalier = z.object({ code_demande: z.string().min(1), accord: z.boolean() });

export const ReponseDemandePalier = z.object({
  demande: z.object({ code_actuel: z.string(), code_demande: z.string(), horodatage: z.string() }),
  palier_en_vigueur: z.string(),
});

/** « Demander le palier supérieur », avec accord explicite. */
export const demanderPalier = oc
  .route({
    method: 'POST',
    path: '/abonnement/demandes-palier',
    successStatus: 201,
    inputStructure: 'detailed',
    operationId: 'demanderPalier',
    tags: ['acces:compte'],
  })
  .errors({
    ACCORD_MANQUANT: { status: 422 },
    PALIER_INCONNU: { status: 404 },
    PALIER_IDENTIQUE: { status: 422 },
    PALIER_NON_SUPERIEUR: { status: 422 },
  })
  .input(z.object({ headers: EnTeteEcriture, body: DemandePalier }))
  .output(ReponseDemandePalier);

export const palier = { demanderPalier };
