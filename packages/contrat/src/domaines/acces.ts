import { oc } from '@orpc/contract';
import { z } from 'zod';

export const ETATS = ['ESSAI', 'ACTIF', 'DELAI_DE_GRACE', 'LECTURE_SEULE', 'SUSPENDU', 'RESILIE'] as const;

const DateJour = z.iso.date();

export const Acces = z.object({
  etat: z.enum(ETATS),
  banniere: z
    .object({
      cause: z.string(),
      consequence: z.string(),
      prochaine_etape_le: DateJour.nullable(),
      lien: z.enum(['portail_abonnement', 'contacter_axion']),
    })
    .nullable(),
  reprise: z.object({ pieces_traitees: z.number().int().min(0) }).nullable(),
});
export type Acces = z.infer<typeof Acces>;

/** Corps d'erreur renvoyé par la garde d'état (L07-T22). */
export const ErreurEtatAcces = z.object({
  etat: z.enum(ETATS),
  raison: z.enum(['etat', 'fonction_non_permise', 'valeur_inconnue']),
});
export type ErreurEtatAcces = z.infer<typeof ErreurEtatAcces>;

/** État d'accès et bannière. Aucun montant. */
export const lireAcces = oc
  .route({ method: 'GET', path: '/acces', inputStructure: 'detailed', operationId: 'lireAcces', tags: ['acces:compte'] })
  .input(z.object({}))
  .output(Acces);

export const acces = { lireAcces };
