import { z } from 'zod';
import { ExplicationEcart } from '../domaines/change.js';
import outilsJson from './outils.json' with { type: 'json' };

export type DeclarationOutil = {
  nom: string;
  niveau: 'L' | 'B';
  permission: string;
  outil_registre: string;
  exigences: string[];
  codes_erreur: string[];
};

export const OUTILS = outilsJson as DeclarationOutil[];
export const NOMS_OUTILS: string[] = OUTILS.map((o) => o.nom);

const id = z.string().min(1);
const centimes = z.number().int().nonnegative();
const devise = z.string().regex(/^[A-Z]{3}$/);
const ligne = z.object({ compte: id, debit_centimes: centimes, credit_centimes: centimes, devise }).strict();
const vue = z.enum(['exercices', 'plan', 'tiers', 'ecritures']);

const SCHEMAS: Record<string, { entree: z.ZodType; sortie: z.ZodType }> = {
  'exercices.lister': {
    entree: z.object({}).strict(),
    sortie: z.object({ exercices: z.array(z.object({ id, libelle: z.string() }).strict()) }).strict(),
  },
  'plan.lister': {
    entree: z.object({ exercice_id: id }).strict(),
    sortie: z.object({ comptes: z.array(z.object({ numero: id, libelle: z.string() }).strict()) }).strict(),
  },
  'tiers.lister': {
    entree: z.object({ recherche: z.string().optional() }).strict(),
    sortie: z.object({ tiers: z.array(z.object({ id, nom: z.string() }).strict()) }).strict(),
  },
  'ecritures.lister': {
    entree: z.object({ exercice_id: id, journal: z.string().optional() }).strict(),
    sortie: z.object({ ecritures: z.array(z.object({ id, date: z.string(), lignes: z.array(ligne) }).strict()) }).strict(),
  },
  'vue.ouvrir': {
    entree: z.object({ vue }).strict(),
    sortie: z.object({ vue }).strict(),
  },
  'change.expliquer_ecart': {
    entree: z.object({ ecart_id: id }).strict(),
    sortie: ExplicationEcart,
  },
  proposer_validation: {
    entree: z.object({ exercice_id: id, lignes: z.array(ligne).min(1) }).strict(),
    sortie: z.object({ proposition_id: id }).strict(),
  },
};

/** Outil vers operationId de la route appelée (lecture seule, même route que l'écran). */
export const ROUTES_OUTILS: Readonly<Record<string, string>> = Object.freeze({
  'change.expliquer_ecart': 'expliquerEcartChange',
});

const connu = (nom: string): boolean => NOMS_OUTILS.includes(nom) && Object.hasOwn(SCHEMAS, nom);

export function schemaEntree(nom: string): z.ZodType | undefined {
  return connu(nom) ? SCHEMAS[nom]?.entree : undefined;
}

export function schemaSortie(nom: string): z.ZodType | undefined {
  return connu(nom) ? SCHEMAS[nom]?.sortie : undefined;
}

export type ResultatEntree =
  | { ok: true; valeur: unknown }
  | { ok: false; code: 'parametre_invalide' | 'outil_hors_liste' };

export function validerEntree(nom: string, brut: unknown): ResultatEntree {
  const schema = schemaEntree(nom);
  if (!schema) return { ok: false, code: 'outil_hors_liste' };
  const r = schema.safeParse(brut);
  return r.success ? { ok: true, valeur: r.data } : { ok: false, code: 'parametre_invalide' };
}
