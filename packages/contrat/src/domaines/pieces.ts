import { oc } from '@orpc/contract';
import { z } from 'zod';

const Mot = z.string().min(1);
const Centimes = z.number().int();
const DateJour = z.iso.date();

/** Aucun pourcentage de confiance : seulement le mot (CTL-010). */
export const PieceResume = z.object({
  id: z.string().min(1),
  nomNormalise: z.string().min(1),
  typePiece: Mot,
  etat: Mot,
  comptee: z.boolean(),
  sensible: z.boolean(),
  datePiece: DateJour.optional(),
  fournisseur: z.string().optional(),
  ttcCentimes: Centimes.optional(),
  motConfiance: Mot,
});
export type PieceResume = z.infer<typeof PieceResume>;

export const ChampPiece = z.object({ nom: Mot, valeur: z.string(), valeurCentimes: Centimes.optional(), mot: Mot, source: Mot });

export const PieceDetail = PieceResume.extend({
  canal: Mot,
  recuLe: z.iso.datetime(),
  motifNonComptee: z.string().optional(),
  motifsAVerifier: z.array(z.string()),
  champs: z.array(ChampPiece),
  cheminVirtuel: z.string().min(1),
});
export type PieceDetail = z.infer<typeof PieceDetail>;

const Montant = z.coerce.number().int();

export const QueryPieces = z
  .object({
    fournisseur: z.string().max(50).optional(),
    du: DateJour.optional(),
    au: DateJour.optional(),
    montantMin: Montant.optional(),
    montantMax: Montant.optional(),
    etat: z.string().max(50).optional(),
    type: z.string().max(50).optional(),
    limite: z.coerce.number().int().min(1).max(100).optional(),
    decalage: z.coerce.number().int().min(0).optional(),
  })
  .refine((q) => !(q.du && q.au && q.du > q.au), { message: 'du apres au' })
  .refine((q) => !(q.montantMin !== undefined && q.montantMax !== undefined && q.montantMin > q.montantMax), { message: 'montantMin apres montantMax' });

export const ReponsePieces = z.object({ body: z.array(PieceResume), decalage: z.number().int().min(0), total: z.number().int().min(0) });

/** Recherche de pièces par fournisseur, période, montant, état. Lecture seule. */
export const listerPieces = oc
  .route({ method: 'GET', path: '/pieces', inputStructure: 'detailed', operationId: 'listerPieces' })
  .input(z.object({ query: QueryPieces.optional() }))
  .output(ReponsePieces);

export const lirePiece = oc
  .route({ method: 'GET', path: '/pieces/{id}', inputStructure: 'detailed', operationId: 'lirePiece' })
  .errors({ PIECE_INCONNUE: { status: 404 } })
  .input(z.object({ params: z.object({ id: z.string().min(1) }) }))
  .output(z.object({ body: PieceDetail }));

export const pieces = { listerPieces, lirePiece };
