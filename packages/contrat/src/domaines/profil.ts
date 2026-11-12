import { oc } from '@orpc/contract';
import { z } from 'zod';
import { cheminSociete } from '../prefixe-routes.js';

/** Listes recopiées de la spec 09 (le contrat n'importe pas le noyau). Une version 2 se fait par ajout. */
export const ORIGINES_PROFIL = ['sirene', 'document', 'saisie_personne', 'proposition_ia'] as const;
export const CONFIANCES_PROFIL = ['sur', 'a_verifier'] as const;
export const STATUTS_CHAMP = ['confirme', 'a_confirmer', 'vide', 'je_ne_sais_pas'] as const;
export const ETATS_PROFIL = ['incomplet', 'a_confirmer', 'complet'] as const;

const DateJour = z.iso.date();
const sous = (suffixe: string) => cheminSociete(suffixe) as `/${string}`;
const Societe = z.object({ s: z.string().min(1) });

export const ChampProfilV1 = z.object({
  cle: z.string().min(1),
  valeur: z.json(),
  origine: z.enum(ORIGINES_PROFIL),
  confiance: z.enum(CONFIANCES_PROFIL),
  source: z.object({ ref: z.string().min(1), date: DateJour }).nullable(),
  statut: z.enum(STATUTS_CHAMP),
  effetDebut: DateJour,
});
export type ChampProfilV1 = z.infer<typeof ChampProfilV1>;

export const ProfilV1 = z.object({
  version: z.literal('profil.v1'),
  etat: z.enum(ETATS_PROFIL),
  champs: z.array(ChampProfilV1),
  manquants: z.array(z.string()),
  aConfirmer: z.array(z.string()),
  /** Codes du hors périmètre (spec 09 §01 règle 6). */
  blocages: z.array(z.string()),
});
export type ProfilV1 = z.infer<typeof ProfilV1>;

export const ReponseProfil = z.object({ body: ProfilV1 });
export const QueryProfil = z.object({ au: DateJour.optional() }).strict();

/** Lecture du profil de la société, à la date `au` (AAAA-MM-JJ) ou à ce jour. */
export const lireProfil = oc
  .route({ method: 'GET', path: sous('/profil'), inputStructure: 'detailed', operationId: 'lireProfil' })
  .input(z.object({ params: Societe, query: QueryProfil.optional() }))
  .output(ReponseProfil);

export const profil = { lireProfil };
