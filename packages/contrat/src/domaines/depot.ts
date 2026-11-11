import { oc } from '@orpc/contract';
import { z } from 'zod';
import { EnTeteEcriture } from '../schemas.js';

/** Canaux d'entrée d'une pièce (spec 04). */
export const CANAUX_DEPOT = ['glisser', 'chat', 'selecteur', 'photo_mobile', 'email', 'plateforme_agreee', 'api', 'dossier_surveille', 'portail_fournisseur'] as const;

export const CodeRefus = z.enum(['type_refuse', 'macro_refusee', 'trop_grand']);
export type CodeRefus = z.infer<typeof CodeRefus>;

/** Un résultat par fichier, dans l'ordre d'envoi. */
export const ResultatDepot = z.discriminatedUnion('statut', [
  z.object({ statut: z.literal('recue'), id: z.string().min(1) }),
  z.object({ statut: z.literal('deja_recue'), id: z.string().min(1), recueLe: z.iso.datetime() }),
  z.object({ statut: z.literal('refusee'), code: CodeRefus, raison: z.string().min(1) }),
]);
export type ResultatDepot = z.infer<typeof ResultatDepot>;

export const EtatPiece = z.object({ etat: z.string().min(1), motif: z.string().optional() });
export type EtatPiece = z.infer<typeof EtatPiece>;

/** Dépôt d'une ou plusieurs pièces (multipart). Données fictives seulement. */
export const deposerPieces = oc
  .route({ method: 'POST', path: '/pieces', inputStructure: 'detailed', operationId: 'deposerPieces' })
  .input(z.object({ headers: EnTeteEcriture, body: z.object({ fichiers: z.array(z.file()).min(1).max(20), canal: z.enum(CANAUX_DEPOT) }) }))
  .output(z.object({ body: z.object({ resultats: z.array(ResultatDepot) }) }));

export const etatPiece = oc
  .route({ method: 'GET', path: '/pieces/{id}/etat', inputStructure: 'detailed', operationId: 'etatPiece' })
  .errors({ PIECE_INCONNUE: { status: 404 } })
  .input(z.object({ params: z.object({ id: z.string().min(1) }) }))
  .output(z.object({ body: EtatPiece }));

export const relancerPiece = oc
  .route({ method: 'POST', path: '/pieces/{id}/relancer', inputStructure: 'detailed', operationId: 'relancerPiece' })
  .errors({ PIECE_INCONNUE: { status: 404 }, RELANCE_IMPOSSIBLE: { status: 409 } })
  .input(z.object({ headers: EnTeteEcriture, params: z.object({ id: z.string().min(1) }) }))
  .output(z.object({ body: EtatPiece }));

export const depot = { deposerPieces, etatPiece, relancerPiece };
