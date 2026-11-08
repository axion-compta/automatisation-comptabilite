import { oc } from '@orpc/contract';
import { z } from 'zod';

const Centimes = z.number().int();
const Id = z.string().min(1);

export const PeriodeTva = z.strictObject({
  id: z.string(),
  exerciceId: z.string(),
  debut: z.string(),
  fin: z.string(),
  statut: z.enum(['ouverte', 'validee', 'deposee_par_client']),
  formulaire: z.string(),
});
export type PeriodeTva = z.infer<typeof PeriodeTva>;

/** `non_calculee` ne porte aucun montant : doute sur la TVA ou régime non traité. */
export const EstimationTva = z.discriminatedUnion('etat', [
  z.strictObject({ exerciceId: z.string(), etat: z.literal('calculee'), collecteeCentimes: Centimes, deductibleCentimes: Centimes }),
  z.strictObject({
    exerciceId: z.string(),
    etat: z.literal('non_calculee'),
    motif: z.enum(['tva_en_doute', 'regime_non_traite']),
    piecesARegarder: z.number().int().min(0).optional(),
  }),
]);
export type EstimationTva = z.infer<typeof EstimationTva>;

export const CaseDeclaration = z.strictObject({
  code: z.string(),
  montantCentimes: Centimes,
  baseCentimes: Centimes.nullable(),
  sources: z.array(z.strictObject({ ecritureId: z.string(), ligneIndex: z.number().int().min(0) })),
});
export type CaseDeclaration = z.infer<typeof CaseDeclaration>;

/** Document préparé : la mention est un code, la phrase est dans `packages/textes`. */
export const DeclarationTva = z.strictObject({
  id: z.string(),
  periodeId: z.string(),
  formulaire: z.string(),
  millesime: z.number().int(),
  mention: z.literal('prepare_par_ia'),
  versionPaquet: z.number().int().min(1),
  statut: z.enum(['validee', 'deposee_par_client']),
  validePar: z.string().nullable(),
  valideLe: z.string().nullable(),
  cases: z.array(CaseDeclaration),
  controles: z.array(z.strictObject({ regleId: z.string(), resultat: z.enum(['ok', 'ecart']) })),
});
export type DeclarationTva = z.infer<typeof DeclarationTva>;

export const ReponsePeriodesTva = z.object({ body: z.array(PeriodeTva), decalage: z.number().int().min(0), total: z.number().int().min(0) });
export const ReponseEstimationTva = z.object({ body: EstimationTva });
export const ReponseDeclarationTva = z.object({ body: DeclarationTva });

export const listerPeriodesTva = oc
  .route({ method: 'GET', path: '/exercices/{exercice}/tva/periodes', inputStructure: 'detailed', operationId: 'listerPeriodesTva', tags: ['acces:lecture'] })
  .errors({ EXERCICE_INCONNU: { status: 404 } })
  .input(
    z.object({
      params: z.object({ exercice: Id }),
      query: z.object({ limite: z.coerce.number().int().min(1).max(100).optional(), decalage: z.coerce.number().int().min(0).optional() }).optional(),
    }),
  )
  .output(ReponsePeriodesTva);

export const lireEstimationTva = oc
  .route({ method: 'GET', path: '/exercices/{exercice}/tva/estimation', inputStructure: 'detailed', operationId: 'lireEstimationTva', tags: ['acces:lecture'] })
  .errors({ EXERCICE_INCONNU: { status: 404 } })
  .input(z.object({ params: z.object({ exercice: Id }) }))
  .output(ReponseEstimationTva);

export const lireDeclarationTva = oc
  .route({ method: 'GET', path: '/tva/declarations/{declaration}', inputStructure: 'detailed', operationId: 'lireDeclarationTva', tags: ['acces:lecture'] })
  .errors({ DECLARATION_INCONNUE: { status: 404 } })
  .input(z.object({ params: z.object({ declaration: Id }) }))
  .output(ReponseDeclarationTva);

export const tva = { listerPeriodesTva, lireEstimationTva, lireDeclarationTva };
