import { oc } from '@orpc/contract';
import { z } from 'zod';
import { EnTeteEcriture } from '../schemas.js';

/** Contenu minimal : un code de titre et un lien, jamais de montant ni de nom de tiers. */
export const NotificationSchema = z
  .object({
    id: z.string().min(1),
    categorie: z.string().min(1),
    gravite: z.enum(['info', 'a_faire', 'urgent', 'bloquant']),
    titreCode: z.string().min(1),
    lien: z.string().min(1),
    creeLe: z.string().min(1),
    lueLe: z.string().min(1).optional(),
  })
  .strict();
export type Notification = z.infer<typeof NotificationSchema>;

export const QueryNotifications = z
  .object({
    nonLues: z.enum(['oui']).optional(),
    limite: z.coerce.number().int().min(1).max(100).optional(),
    decalage: z.coerce.number().int().min(0).optional(),
  })
  .strict();

export const ReponseNotifications = z.object({
  body: z.array(NotificationSchema),
  decalage: z.number().int().min(0),
  total: z.number().int().min(0),
});
export const ReponseNotification = z.object({ body: NotificationSchema });
export const ReponseToutLire = z.object({ body: z.object({ marquees: z.number().int().min(0) }).strict() });

const erreurs = { NOTIFICATION_INCONNUE: { status: 404 } } as const;

/** Notifications de la personne connectée, les plus récentes d'abord. */
export const listerNotifications = oc
  .route({ method: 'GET', path: '/notifications', inputStructure: 'detailed', operationId: 'listerNotifications' })
  .input(z.object({ query: QueryNotifications.optional() }))
  .output(ReponseNotifications);

/** Marque une notification lue ; la rejouer ne change pas `lueLe`. */
export const marquerLue = oc
  .route({ method: 'POST', path: '/notifications/{id}/lue', inputStructure: 'detailed', operationId: 'marquerLue' })
  .errors(erreurs)
  .input(z.object({ params: z.object({ id: z.string().min(1) }), headers: EnTeteEcriture }))
  .output(ReponseNotification);

/** Marque toutes les notifications non lues de la personne ; renvoie le nombre marqué. */
export const toutLire = oc
  .route({ method: 'POST', path: '/notifications/tout-lire', inputStructure: 'detailed', operationId: 'toutLire' })
  .input(z.object({ headers: EnTeteEcriture }))
  .output(ReponseToutLire);

export const notifications = { listerNotifications, marquerLue, toutLire };
