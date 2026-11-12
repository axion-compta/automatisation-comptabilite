import { oc } from '@orpc/contract';
import { z } from 'zod';
import { dateValide } from '../../../noyau/src/interface/dates.js';

export const TYPES_ECHEANCE = ['tva', 'acompte_is', 'liasse', 'cfe', 'autre'] as const;
export const MODES_VOCABULAIRE = ['simple', 'comptable'] as const;

const Jour = z.string().refine(dateValide, 'date_invalide');

export const LigneEcheanceSchema = z.strictObject({
  id: z.string(),
  type: z.enum(TYPES_ECHEANCE),
  dateLimite: z.string().optional(),
  statut: z.enum(['a_venir', 'faite', 'en_retard', 'inconnue']),
  aVerifier: z.boolean(),
  sourceUrl: z.string().optional(),
});
export const TermeSchema = z.strictObject({ code: z.string(), mot: z.string(), survol: z.string().optional() });

/** `du` et `au` sont obligatoires (AAAA-MM-JJ) ; tout autre champ est refusé. */
export const QueryCalendrier = z.strictObject({ du: Jour, au: Jour });
export const QueryVocabulaire = z.strictObject({ mode: z.enum(MODES_VOCABULAIRE) });

export const lireCalendrier = oc
  .route({ method: 'GET', path: '/exercices/{exercice}/calendrier', inputStructure: 'detailed', operationId: 'lireCalendrier', tags: ['acces:lecture'] })
  .errors({ EXERCICE_INCONNU: { status: 404 }, ORDRE_INVERSE: { status: 400 } })
  .input(z.object({ params: z.object({ exercice: z.string().min(1) }), query: QueryCalendrier }))
  .output(z.object({ body: z.array(LigneEcheanceSchema) }));

export const lireVocabulaire = oc
  .route({ method: 'GET', path: '/vocabulaire', inputStructure: 'detailed', operationId: 'lireVocabulaire', tags: ['acces:lecture'] })
  .input(z.object({ query: QueryVocabulaire }))
  .output(z.object({ body: z.array(TermeSchema) }));

export const calendrier = { lireCalendrier, lireVocabulaire };
