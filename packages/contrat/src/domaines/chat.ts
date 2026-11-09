import { oc } from '@orpc/contract';
import { z } from 'zod';
import { EnTeteEcriture } from '../schemas.js';
import { schemaDemande } from '../chat/evenements.js';
import { cheminSociete } from '../prefixe-routes.js';

export const EnTeteChat = EnTeteEcriture.extend({ authorization: z.string().min(1).optional() });
export const ERREURS_IDENTITE = { NON_AUTHENTIFIE: { status: 401 }, SOCIETE_REFUSEE: { status: 403 }, DROIT_INSUFFISANT: { status: 403 } } as const;

const sous = (suffixe: string) => cheminSociete(suffixe) as `/${string}`;

/** Plafond de longueur du texte : en attendant les réglages (L05-T54), valeur de contrat nommée. */
export const LONGUEUR_TEXTE_MAX = 2000;
export const DemandeEnvoi = schemaDemande(LONGUEUR_TEXTE_MAX);

/** Flux text/event-stream (codé par encoderEvenement) ; l'export OpenAPI le décrit comme tel. */
export const envoyerMessage = oc
  .route({ method: 'POST', path: sous('/chat/messages'), inputStructure: 'detailed', operationId: 'posterMessageChat', tags: ['flux:evenements'] })
  .errors(ERREURS_IDENTITE)
  .input(z.object({ params: z.object({ s: z.string().min(1) }), headers: EnTeteChat, body: DemandeEnvoi }))
  .output(z.instanceof(Blob));

export const arreterTour = oc
  .route({ method: 'POST', path: sous('/chat/tours/{id}/arreter'), inputStructure: 'detailed', operationId: 'arreterTour' })
  .errors({ TOUR_INCONNU: { status: 404 }, ...ERREURS_IDENTITE })
  .input(z.object({ params: z.object({ s: z.string().min(1), id: z.string().min(1) }), headers: EnTeteChat }))
  .output(z.object({ body: z.object({ tour_id: z.string(), arrete: z.literal(true) }) }));

export const chat = { envoyerMessage, arreterTour };
