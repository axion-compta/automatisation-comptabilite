import { http, HttpResponse, type HttpHandler } from 'msw';
import { QueryNotifications } from '../../../contrat/src/domaines/notifications.js';
import { creerServiceNotifications, ErreurNotification } from '../../../contrat/src/domaines/notifications-service.js';
import { EnTeteEcriture } from '../../../contrat/src/schemas.js';

const erreur = (code: string, status: number) => HttpResponse.json({ defined: status === 404, code, status, message: code }, { status });
const NOMS = Object.keys(QueryNotifications.shape);

/** Handlers des trois routes des notifications, branchés sur le service du contrat ; `Idempotency-Key` exigée sur les POST. */
export function creerHandlersNotifications(base: string, attendre: () => Promise<void>, ...reste: unknown[]): HttpHandler[] {
  void reste;
  const service = creerServiceNotifications();
  const cle = (request: Request) => EnTeteEcriture.safeParse({ 'idempotency-key': request.headers.get('idempotency-key') ?? undefined });

  return [
    http.get(base + '/notifications', async ({ request }) => {
      await attendre();
      const q = new URL(request.url).searchParams;
      const cles = [...q.keys()];
      if (cles.some((k) => !NOMS.includes(k)) || NOMS.some((n) => q.getAll(n).length > 1)) return erreur('BAD_REQUEST', 400);
      const query = QueryNotifications.safeParse(Object.fromEntries(cles.map((k) => [k, q.get(k)])));
      if (!query.success) return erreur('BAD_REQUEST', 400);
      return HttpResponse.json(service.lister({ nonLues: query.data.nonLues === 'oui', limite: query.data.limite, decalage: query.data.decalage }));
    }),

    http.post(base + '/notifications/tout-lire', async ({ request }) => {
      await attendre();
      const entete = cle(request);
      if (!entete.success) return erreur('BAD_REQUEST', 400);
      return HttpResponse.json(service.toutLire(entete.data['idempotency-key']));
    }),

    http.post(base + '/notifications/:id/lue', async ({ request, params }) => {
      await attendre();
      const entete = cle(request);
      if (!entete.success) return erreur('BAD_REQUEST', 400);
      try {
        return HttpResponse.json(service.marquerLue(String(params['id']), entete.data['idempotency-key']));
      } catch (e) {
        if (e instanceof ErreurNotification) return erreur('NOTIFICATION_INCONNUE', 404);
        throw e;
      }
    }),
  ];
}
