import { oc } from '@orpc/contract';
import { z } from 'zod';
import { EnTeteEcriture } from '../schemas.js';

/** Écarter un contrôle. La personne vient de la session, jamais de l'entrée ; la société n'est pas un paramètre. */
export const TraceEcartee = z.strictObject({
  regleId: z.string().min(1), objetId: z.string().min(1), resultat: z.literal('ECARTE'),
  motif: z.string().min(1), par: z.string().min(1), horodatage: z.string(),
});
export type TraceEcartee = z.infer<typeof TraceEcartee>;

export const CODES_422 = ['controle_non_ecartable', 'motif_obligatoire', 'auteur_obligatoire', 'horodatage_anterieur'] as const;
const Refus422 = z.strictObject({ code: z.enum(CODES_422) });
const ERREURS = {
  NON_AUTHENTIFIE: { status: 401 }, REAUTHENTIFICATION_REQUISE: { status: 401 }, PERMISSION_MANQUANTE: { status: 403 },
  ACTEUR_NON_HUMAIN: { status: 403 }, TRACE_INCONNUE: { status: 404 }, REFUS: { status: 422, data: Refus422 },
} as const;

/** `trace` = `regleId~objetId`. */
export const ecarterControle = oc
  .route({ method: 'POST', path: '/controles/{trace}/ecarter', inputStructure: 'detailed', operationId: 'ecarterControle' })
  .errors(ERREURS)
  .input(z.object({ params: z.object({ trace: z.string().min(3) }), headers: EnTeteEcriture, body: z.strictObject({ motif: z.string() }) }))
  .output(z.object({ body: TraceEcartee }));

export const ReponseReverification = z.strictObject({ exercice: z.string().min(1), verifiees: z.number().int().min(0), ouvertes: z.number().int().min(0) });
export type ReponseReverification = z.infer<typeof ReponseReverification>;

/** Revérifier à la demande : même périmètre que le passage nocturne pour l'exercice demandé. */
export const reverifierControles = oc
  .route({ method: 'POST', path: '/controles/reverifier', inputStructure: 'detailed', operationId: 'reverifierControles' })
  .errors({ NON_AUTHENTIFIE: ERREURS.NON_AUTHENTIFIE, ACTEUR_NON_HUMAIN: ERREURS.ACTEUR_NON_HUMAIN, EXERCICE_INCONNU: { status: 404 } })
  .input(z.object({ headers: EnTeteEcriture, body: z.strictObject({ exercice: z.string().min(1) }) }))
  .output(z.object({ body: ReponseReverification }));

export const controlesActions = { ecarterControle, reverifierControles };
