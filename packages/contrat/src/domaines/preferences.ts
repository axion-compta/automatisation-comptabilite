import { oc } from '@orpc/contract';
import { z } from 'zod';
import { EnTeteEcriture } from '../schemas.js';

export const APPAREILS_LECTURE = ['bureau', 'mobile'] as const;
export const MAX_EVENEMENTS_USAGE = 100;

export const QueryPreferences = z.object({ appareil: z.enum(APPAREILS_LECTURE).optional() }).strict();

const Origine = z.enum(['defaut', 'personne', 'systeme']);
export const ReponsePreferences = z.object({
  body: z.record(z.string(), z.object({ valeur: z.unknown(), origine: Origine }).strict()),
});

export const CorpsPreference = z
  .object({
    valeur: z.unknown(),
    appareil: z.enum(['bureau', 'mobile', 'tous']),
    modifieLeClient: z.number().int().optional(),
  })
  .strict();
export const ReponsePreference = z.object({
  body: z.object({ cle: z.string(), appareil: z.string(), valeur: z.unknown(), origine: Origine }).strict(),
});

/** Éléments laissés bruts : la liste blanche des champs est appliquée par le service (400 `champ_inconnu`). */
export const CorpsUsage = z.object({ evenements: z.array(z.unknown()).max(MAX_EVENEMENTS_USAGE) }).strict();

const erreurs = {
  PREFERENCE_INVALIDE: { status: 400 },
  FORMAT_FIXE: { status: 400 },
} as const;

/** Lecture des préférences de la personne connectée (valeurs par défaut comprises). */
export const lirePreferences = oc
  .route({ method: 'GET', path: '/preferences', inputStructure: 'detailed', operationId: 'lirePreferences' })
  .input(z.object({ query: QueryPreferences.optional() }))
  .output(ReponsePreferences);

/** Écriture idempotente : la dernière écriture gagne, jamais de 409 de version. */
export const ecrirePreference = oc
  .route({ method: 'PUT', path: '/preferences/{cle}', inputStructure: 'detailed', operationId: 'ecrirePreference' })
  .errors(erreurs)
  .input(z.object({ params: z.object({ cle: z.string().min(1) }), headers: EnTeteEcriture, body: CorpsPreference }))
  .output(ReponsePreference);

/** Mesure d'usage sans contenu : 204, rien n'est écrit si la mesure est désactivée. */
export const mesurerUsage = oc
  .route({ method: 'POST', path: '/usage', inputStructure: 'detailed', operationId: 'mesurerUsage', successStatus: 204 })
  .errors({ CHAMP_INCONNU: { status: 400 } })
  .input(z.object({ headers: EnTeteEcriture, body: CorpsUsage }))
  .output(z.object({}));

export const preferences = { lirePreferences, ecrirePreference, mesurerUsage };
