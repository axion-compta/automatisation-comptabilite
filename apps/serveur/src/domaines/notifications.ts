import { implement } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import {
  creerServiceNotifications,
  ErreurNotification,
  type ServiceNotifications as ServiceComplet,
} from '../../../../packages/contrat/src/domaines/notifications-service.js';

/** Le branchement commun (app.ts) passe `{}` par défaut : dans ce cas, un service en mémoire neuf est créé. */
export type ServiceNotifications = Partial<ServiceComplet>;

/** Routes des notifications, branchées sur le service en mémoire. */
export function routesNotifications(fourni: ServiceNotifications = {}) {
  const service = fourni.lister ? (fourni as ServiceComplet) : creerServiceNotifications();
  const os = implement(contrat.notifications);
  return {
    listerNotifications: os.listerNotifications.handler(({ input }) => {
      const q = input.query;
      return service.lister({ nonLues: q?.nonLues === 'oui', limite: q?.limite, decalage: q?.decalage });
    }),
    marquerLue: os.marquerLue.handler(({ input, errors }) => {
      try {
        return service.marquerLue(input.params.id, input.headers['idempotency-key']);
      } catch (e) {
        if (e instanceof ErreurNotification) throw errors.NOTIFICATION_INCONNUE();
        throw e;
      }
    }),
    toutLire: os.toutLire.handler(({ input }) => service.toutLire(input.headers['idempotency-key'])),
  };
}
