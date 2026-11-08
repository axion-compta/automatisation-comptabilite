import { oc } from '@orpc/contract';
import { z } from 'zod';
import { dateValide } from '../../../noyau/src/interface/dates.js';

export const STATUTS_ECHEANCE = ['a_venir', 'faite', 'en_retard'] as const;
export const NIVEAUX_ECHEANCE = ['prepare', 'alerte', 'rappel_seul'] as const;

const Jour = z.string().refine(dateValide, 'date_invalide');

/** `dateAVerifier` : l'échéance est affichée « date à vérifier » (statut du paramètre non vérifié). */
export const Echeance = z.strictObject({
  code: z.string().min(1),
  dateLimite: z.string().refine(dateValide, 'date_invalide'),
  statut: z.enum(STATUTS_ECHEANCE),
  dateAVerifier: z.boolean(),
  niveau: z.enum(NIVEAUX_ECHEANCE),
});
export type Echeance = z.infer<typeof Echeance>;

export const ReponseEcheances = z.object({ body: z.array(Echeance), total: z.number().int().min(0) });
export type ReponseEcheances = z.infer<typeof ReponseEcheances>;

/** `du` et `au` obligatoires (AAAA-MM-JJ), bornes incluses ; tout autre champ est refusé. */
export const QueryEcheances = z.strictObject({ du: Jour, au: Jour });

export const listerEcheances = oc
  .route({ method: 'GET', path: '/echeances', inputStructure: 'detailed', operationId: 'listerEcheances', tags: ['acces:lecture'] })
  .errors({ ORDRE_INVERSE: { status: 400 } })
  .input(z.object({ query: QueryEcheances }))
  .output(ReponseEcheances);

export const echeances = { listerEcheances };
