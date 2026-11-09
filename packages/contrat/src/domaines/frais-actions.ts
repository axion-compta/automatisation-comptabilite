import { oc } from '@orpc/contract';
import { z } from 'zod';
import { CleIdempotence } from '../schemas.js';
import { FraisDetail } from './frais.js';

const Centimes = z.number().int().min(0);
const Texte = z.string().trim().min(1).max(200);
const Declaration = z.enum(['personne', 'societe']);
const Id = z.string().min(1).max(50);

/** `x-personne` : identité fictive d'essai, remplacée par l'identité réelle plus tard (J3a). */
const EnTetes = { 'idempotency-key': CleIdempotence, 'x-personne': Id };
const EnTetesModif = z.object({ ...EnTetes, 'if-match': z.string().regex(/^[1-9]\d{0,8}$/) });

const Commun = { personneId: Id, date: z.iso.date() };
export const NouveauFrais = z.discriminatedUnion('nature', [
  z.object({ nature: z.literal('depense'), ...Commun, libelle: Texte, montantTtcCentimes: Centimes, pieceId: Id.optional(), declaration: Declaration.optional() }),
  z.object({ nature: z.literal('trajet'), ...Commun, depart: Texte, arrivee: Texte, motif: Texte, vehiculeId: Id, kmTexte: z.string().max(20), allerRetour: z.boolean().optional() }),
]);
export type NouveauFrais = z.infer<typeof NouveauFrais>;
export const CompletementFrais = z.object({ declaration: Declaration.optional(), motifSansJustificatif: Texte.optional(), partPersoTtcCentimes: Centimes.optional(), vehiculeId: Id.optional(), pieceId: Id.optional() });
export type CompletementFrais = z.infer<typeof CompletementFrais>;
const ErreursCommunes = { PERSONNE_DIFFERENTE: { status: 403 }, DOUBLON_PIECE: { status: 409 }, VEHICULE_SOCIETE: { status: 409 }, CLE_REUTILISEE: { status: 409 }, ENTREE_INVALIDE: { status: 400 } } as const;
export const creerFrais = oc
  .route({ method: 'POST', path: '/frais', inputStructure: 'detailed', operationId: 'creerFrais', successStatus: 201 })
  .errors(ErreursCommunes)
  .input(z.object({ headers: z.object(EnTetes), body: NouveauFrais }))
  .output(z.object({ body: FraisDetail }));

/** `If-Match` = version lue du frais. */
export const completerFrais = oc
  .route({ method: 'PATCH', path: '/frais/{id}', inputStructure: 'detailed', operationId: 'completerFrais' })
  .errors({ ...ErreursCommunes, FRAIS_INCONNU: { status: 404 }, VERSION_PERIMEE: { status: 412 }, FRAIS_VALIDE: { status: 409 }, TRANSITION_INTERDITE: { status: 409 } })
  .input(z.object({ params: z.object({ id: z.string().min(1) }), headers: EnTetesModif, body: CompletementFrais }))
  .output(z.object({ body: FraisDetail }));

export const fraisActions = { creerFrais, completerFrais };
