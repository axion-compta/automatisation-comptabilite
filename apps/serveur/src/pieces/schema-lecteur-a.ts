// Schéma de la sortie du lecteur A : JSON strict, aucun champ en trop. Le modèle ne calcule rien.
import { z } from 'zod';
import { TYPES_PIECE } from '../../../../packages/noyau/src/pieces/types.js';

export const VERSION_SCHEMA = 1;

const CHAMPS_MAX = 100;
const CITATION_MAX = 300;
const CONFIANCE_MAX = 100;

export const champModeleSchema = z
  .object({
    nom: z.string(),
    valeur: z.string(),
    confiance_modele: z.number().int().min(0).max(CONFIANCE_MAX),
    citation: z.string().min(1).max(CITATION_MAX),
  })
  .strict();

export const sortieLecteurASchema = z
  .object({
    type_piece: z.enum(TYPES_PIECE),
    langue: z.enum(['fr', 'en', 'autre']),
    champs: z.array(champModeleSchema).max(CHAMPS_MAX),
  })
  .strict();

export type SortieLecteurA = z.infer<typeof sortieLecteurASchema>;
