import { oc } from '@orpc/contract';
import { z } from 'zod';
import { EnTeteEcriture } from '../schemas.js';
import { PieceDetail } from './pieces.js';

export const CorpsCorrection = z.object({ valeur: z.string().min(1).max(200), pourquoi: z.string().min(1).max(500) });
export type CorpsCorrection = z.infer<typeof CorpsCorrection>;

/** Correction d'un champ lu : le nom normalisé et le chemin virtuel sont recalculés. */
export const corrigerChamp = oc
  .route({ method: 'PATCH', path: '/pieces/{id}/champs/{nom}', inputStructure: 'detailed', operationId: 'corrigerChamp' })
  .errors({ PIECE_INCONNUE: { status: 404 }, CHAMP_INCONNU: { status: 404 }, VALEUR_ILLISIBLE: { status: 400 }, PIECE_SENSIBLE: { status: 409 } })
  .input(z.object({ headers: EnTeteEcriture, params: z.object({ id: z.string().min(1), nom: z.string().min(1) }), body: CorpsCorrection }))
  .output(z.object({ body: PieceDetail }));

export const correction = { corrigerChamp };
