import { oc } from '@orpc/contract';
import { z } from 'zod';

export const TYPES_RECHERCHE = ['piece', 'ecriture', 'tiers', 'commentaire'] as const;
export const BORNES_Q = { min: 2, max: 200 } as const;
export const BORNES_LIMITE = { min: 1, max: 20, defaut: 10 } as const;

const longueur = (s: string): number => [...s].length;

export const CorpsRecherche = z.strictObject({
  q: z.string().refine((s) => longueur(s) >= BORNES_Q.min && longueur(s) <= BORNES_Q.max),
  types: z.array(z.enum(TYPES_RECHERCHE)).optional(),
  limite: z.number().int().min(BORNES_LIMITE.min).max(BORNES_LIMITE.max).optional(),
  curseur: z.string().max(200).optional(),
});
export type CorpsRecherche = z.infer<typeof CorpsRecherche>;

export const ResultatRecherche = z.object({
  type: z.enum(TYPES_RECHERCHE),
  id: z.string(),
  titre: z.string(),
  extrait: z.string(),
  lien: z.string(),
  date: z.string(),
  exerciceId: z.string().nullable(),
  score: z.number(),
});
export type ResultatRecherche = z.infer<typeof ResultatRecherche>;

export const ReponseRecherche = z.object({
  body: z.object({
    resultats: z.array(ResultatRecherche),
    curseurSuivant: z.string().optional(),
    mot: z.literal('rien_trouve').optional(),
  }),
});

/** Recherche globale : lecture en POST, le texte cherché est dans le corps (jamais dans l'URL). */
export const chercher = oc
  .route({ method: 'POST', path: '/recherche', inputStructure: 'detailed', operationId: 'chercher', tags: ['lecture-par-post', 'sans-effet', 'acces:lecture'] })
  .errors({ REQUETE_INVALIDE: { status: 400 }, CURSEUR_INVALIDE: { status: 400 } })
  .input(z.object({ body: CorpsRecherche }))
  .output(ReponseRecherche);

export const recherche = { chercher };
