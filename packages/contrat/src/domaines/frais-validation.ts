import { oc } from '@orpc/contract';
import { z } from 'zod';
import { CleIdempotence } from '../schemas.js';
const Id = z.string().min(1).max(50);
const Centimes = z.number().int().min(0);
const Cle = { 'idempotency-key': CleIdempotence };
export const LigneProposee = z.object({ compte: z.string(), libelle: z.string(), debitCentimes: Centimes, creditCentimes: Centimes });
/** Écriture proposée : jamais validée par l'IA, une personne la valide. */
export const EcritureProposee = z.object({ id: z.string(), fraisId: Id, date: z.iso.date(), statut: z.literal('propose'), lignes: z.array(LigneProposee) });
export type EcritureProposee = z.infer<typeof EcritureProposee>;
export const ValidationFrais = z.object({ fraisId: Id, ecritureId: z.string(), annulableAvant: z.number().int().min(0) });
export const CorpsValidation = z.object({ ids: z.array(Id).min(1).max(100).refine((l) => new Set(l).size === l.length, 'doublon'), confirmeRecapitulatif: z.boolean().optional() });
export const CorpsRemboursement = z.object({ personneId: Id, fraisIds: z.array(Id).min(1).max(100), montantCentimes: z.number().int().min(1).optional() });
/** Remboursement préparé seulement : aucun champ d'ordre émis. */
export const RemboursementPrepare = z.object({ id: z.string(), personneId: Id, fraisIds: z.array(Id), montantCentimes: Centimes, statut: z.literal('propose') });
export type RemboursementPrepare = z.infer<typeof RemboursementPrepare>;
const Erreurs = { FRAIS_INCONNU: { status: 404 }, ENTREE_INVALIDE: { status: 400 }, CLE_REUTILISEE: { status: 409 }, FRAIS_PAYE_SOCIETE: { status: 409 } } as const;
export const proposerFrais = oc
  .route({ method: 'POST', path: '/frais/{id}/proposer', inputStructure: 'detailed', operationId: 'proposerFrais' })
  .errors({ ...Erreurs, JUSTIFICATIF_MANQUANT: { status: 409 }, BAREME_A_VERIFIER: { status: 409 } })
  .input(z.object({ params: z.object({ id: Id }), headers: z.object(Cle) }))
  .output(z.object({ body: EcritureProposee }));
/** `x-personne` obligatoire : la validation est faite par une personne. */
export const validerFrais = oc
  .route({ method: 'POST', path: '/frais/valider', inputStructure: 'detailed', operationId: 'validerFrais' })
  .errors({ ...Erreurs, JUSTIFICATIF_MANQUANT: { status: 409 }, BAREME_A_VERIFIER: { status: 409 }, RECAPITULATIF_A_CONFIRMER: { status: 409, data: z.object({ totalCentimes: Centimes }) } })
  .input(z.object({ headers: z.object({ ...Cle, 'x-personne': Id }), body: CorpsValidation }))
  .output(z.object({ body: z.array(ValidationFrais) }));
export const preparerRemboursement = oc
  .route({ method: 'POST', path: '/remboursements', inputStructure: 'detailed', operationId: 'preparerRemboursement', successStatus: 201 })
  .errors({ ...Erreurs, REMBOURSEMENT_SUPERIEUR: { status: 409 } })
  .input(z.object({ headers: z.object(Cle), body: CorpsRemboursement }))
  .output(z.object({ body: RemboursementPrepare }));
export const fraisValidation = { proposerFrais, validerFrais, preparerRemboursement };
