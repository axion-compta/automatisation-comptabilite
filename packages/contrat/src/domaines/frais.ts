import { oc } from '@orpc/contract';
import { z } from 'zod';

/** Liste recopiée du noyau (le contrat n'importe pas le noyau). Ajout seul, jamais de renommage. */
export const STATUTS_FRAIS = ['brouillon', 'a_completer', 'propose', 'valide', 'rembourse', 'en_compte_courant', 'exclu_paye_societe', 'refuse', 'perso'] as const;

const Centimes = z.number().int().min(0);
const DateJour = z.iso.date();

export const FraisResume = z.object({
  id: z.string().min(1),
  personneId: z.string().min(1),
  nature: z.enum(['depense', 'trajet']),
  date: DateJour,
  libelle: z.string(),
  montantTtcCentimes: Centimes,
  payeur: z.enum(['societe', 'personne', 'a_confirmer']),
  statut: z.enum(STATUTS_FRAIS),
  manque: z.array(z.string()).optional(),
  kmDixiemes: z.number().int().min(0).optional(),
  montantTrajetCentimes: Centimes.nullable().optional(),
});
export type FraisResume = z.infer<typeof FraisResume>;

/** Trois totaux séparés : jamais additionnés, aucun « total général ». */
export const Totaux = z.object({
  aRembourserCentimes: Centimes,
  enAttenteCentimes: Centimes,
  exclusCentimes: Centimes,
  kmSansMontantDixiemes: z.number().int().min(0),
});
export type Totaux = z.infer<typeof Totaux>;

export const FraisDetail = FraisResume.extend({
  trajet: z.object({ depart: z.string(), arrivee: z.string(), motif: z.string(), kmSaisisDixiemes: z.number().int().min(0), allerRetour: z.boolean() }).optional(),
  vehiculeId: z.string().optional(),
  pieceId: z.string().optional(),
  motifSansJustificatif: z.string().optional(),
  partPersoTtcCentimes: Centimes,
  version: z.number().int().min(1),
});
export type FraisDetail = z.infer<typeof FraisDetail>;

export const ReponseFrais = z.object({
  body: z.array(FraisResume),
  decalage: z.number().int().min(0),
  total: z.number().int().min(0),
  totaux: Totaux,
});
export const ReponseFraisDetail = z.object({ body: FraisDetail });

/** Liste filtrée (personne, période, statut) avec les trois totaux de toute la sélection. */
export const listerFrais = oc
  .route({ method: 'GET', path: '/frais', inputStructure: 'detailed', operationId: 'listerFrais' })
  .errors({ BORNES_INVALIDES: { status: 400 } })
  .input(
    z.object({
      query: z
        .object({
          personne: z.string().max(50).optional(),
          du: DateJour.optional(),
          au: DateJour.optional(),
          statut: z.enum(STATUTS_FRAIS).optional(),
          limite: z.coerce.number().int().min(1).max(100).optional(),
          decalage: z.coerce.number().int().min(0).optional(),
        })
        .optional(),
    }),
  )
  .output(ReponseFrais);

export const lireFrais = oc
  .route({ method: 'GET', path: '/frais/{id}', inputStructure: 'detailed', operationId: 'lireFrais' })
  .errors({ FRAIS_INCONNU: { status: 404 } })
  .input(z.object({ params: z.object({ id: z.string().min(1) }) }))
  .output(ReponseFraisDetail);

export const frais = { listerFrais, lireFrais };
