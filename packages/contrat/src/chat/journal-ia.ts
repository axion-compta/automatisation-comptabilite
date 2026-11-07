import { z } from 'zod';
import { CONFIANCES, ISSUES_APPEL_IA, SOURCES_PROPOSITION } from '../../../noyau/src/chat/types.js';

// Journal de l'IA : aucun texte d'entrée ni de sortie, aucune donnée sensible en clair.
export const CHAMPS_INTERDITS = ['texte', 'entree', 'sortie', 'prompt', 'consigne', 'contenu'] as const;

const MOTIF_MAX_CAR = 200;
const code = z.string().regex(/^[a-z0-9_.-]+$/);
const identifiant = z.string().regex(/^[A-Za-z0-9_.:-]+$/);
const entier = z.number().refine((n) => Number.isSafeInteger(n) && n >= 0);
const sansIban = (s: string): boolean => !/\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]){11,30}\b/i.test(s);
const sourceLegale = z.string().regex(/^DEC-\d+:[A-Za-z0-9_.-]+@[A-Za-z0-9_.-]+$/);
const unDesDeux = (o: { piece_id?: string | undefined; conversation_id?: string | undefined }): boolean =>
  o.piece_id !== undefined || o.conversation_id !== undefined;
const rattachement = { piece_id: identifiant.optional(), conversation_id: identifiant.optional() };

export const AppelIa = z
  .object({
    id: identifiant,
    agent: code,
    ...rattachement,
    alias: code,
    modele: code,
    version_modele: code,
    fournisseur: code,
    region: code,
    jetons_entree: entier,
    jetons_sortie: entier,
    cout_micro_centimes: entier,
    duree_ms: entier,
    issue: z.enum(ISSUES_APPEL_IA),
  })
  .strict()
  .refine(unDesDeux);
export type AppelIa = z.infer<typeof AppelIa>;

export const DecisionIa = z
  .object({
    id: identifiant,
    quand: z.iso.datetime(),
    agent: code,
    etape: code,
    demandeur: z.union([
      z.object({ sorte: z.literal('personne'), id: identifiant }).strict(),
      z.object({ sorte: z.literal('systeme') }).strict(),
    ]),
    ...rattachement,
    objet: z.object({ type: code, id: identifiant }).strict(),
    proposition: code,
    source_proposition: z.enum(SOURCES_PROPOSITION),
    confiance: z.enum(CONFIANCES),
    motif: z.string().max(MOTIF_MAX_CAR).refine(sansIban),
    sources_legales: z.array(sourceLegale),
    appel_id: identifiant,
    cout_micro_centimes: entier,
  })
  .strict()
  .refine(unDesDeux);
export type DecisionIa = z.infer<typeof DecisionIa>;
