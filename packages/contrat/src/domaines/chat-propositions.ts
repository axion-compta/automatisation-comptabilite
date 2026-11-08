import { oc } from '@orpc/contract';
import { z } from 'zod';
import { EnTeteChat, ERREURS_IDENTITE } from './chat.js';
import { AppelIa, DecisionIa } from '../chat/journal-ia.js';
import { cheminSociete } from '../prefixe-routes.js';
import { ETATS_PROPOSITION, NIVEAUX } from '../../../noyau/src/chat/types.js';

/** Vue d'une proposition : jamais le texte d'une pièce ni d'un message. */
export const PropositionVue = z
  .object({
    id: z.string().min(1), outil: z.string().min(1), niveau: z.enum(NIVEAUX), etat: z.enum(ETATS_PROPOSITION), nombre_objets: z.number().int().min(1),
    cree_le: z.iso.datetime(), expire_le: z.iso.datetime(), applique_le: z.iso.datetime().optional(),
  })
  .strict();
export type PropositionVue = z.infer<typeof PropositionVue>;

export const Pourquoi = z.object({ decision: DecisionIa, appel: AppelIa }).strict();

const parametres = z.object({ s: z.string().min(1), id: z.string().min(1) });
const INCONNUE = { PROPOSITION_INCONNUE: { status: 404 }, ...ERREURS_IDENTITE } as const;
const chemin = cheminSociete('/chat/propositions/{id}') as `/${string}`;

export const lireProposition = oc
  .route({ method: 'GET', path: chemin, inputStructure: 'detailed', operationId: 'lireProposition' })
  .errors(INCONNUE).input(z.object({ params: parametres, headers: EnTeteChat.partial() })).output(z.object({ body: PropositionVue }));

export const appliquerProposition = oc
  .route({ method: 'POST', path: `${chemin}/appliquer`, inputStructure: 'detailed', operationId: 'appliquerProposition' })
  .errors({ ...INCONNUE, ACTEUR_NON_HUMAIN: { status: 403 }, PROPOSITION_EXPIREE: { status: 409 }, NIVEAU_FERME: { status: 423 } })
  .input(z.object({ params: parametres, headers: EnTeteChat }))
  .output(z.object({ body: PropositionVue }));

export const annulerProposition = oc
  .route({ method: 'POST', path: `${chemin}/annuler`, inputStructure: 'detailed', operationId: 'annulerProposition' })
  .errors({ ...INCONNUE, ANNULATION_EXPIREE: { status: 409 } })
  .input(z.object({ params: parametres, headers: EnTeteChat }))
  .output(z.object({ body: PropositionVue }));

export const pourquoi = oc
  .route({ method: 'GET', path: `${chemin}/pourquoi`, inputStructure: 'detailed', operationId: 'pourquoiProposition' })
  .errors(INCONNUE).input(z.object({ params: parametres, headers: EnTeteChat.partial() })).output(z.object({ body: Pourquoi }));

export const chatPropositions = { lireProposition, appliquerProposition, annulerProposition, pourquoi };
