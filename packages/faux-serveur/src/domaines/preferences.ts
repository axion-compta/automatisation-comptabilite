import { http, HttpResponse, type HttpHandler } from 'msw';
import { CorpsPreference, CorpsUsage, QueryPreferences } from '../../../contrat/src/domaines/preferences.js';
import { creerServicePreferences, ErreurPreference, ErreurUsage } from '../../../contrat/src/domaines/preferences-service.js';
import { EnTeteEcriture } from '../../../contrat/src/schemas.js';
import type { OptionsFauxServeur } from '../handlers.js';

const erreur = (code: string, status: number) => HttpResponse.json({ defined: false, code, status, message: code }, { status });
const NOMS_PANNE = { 403: 'FORBIDDEN', 423: 'RESSOURCE_VERROUILLEE' } as const;

/** Handlers des préférences et de la mesure d'usage, branchés sur le service du contrat (service neuf par fabrique). */
export function creerHandlersPreferences(base: string, attendre: () => Promise<void>, options: OptionsFauxServeur = {}): HttpHandler[] {
  const service = creerServicePreferences();
  /** `x-panne: reseau` coupe le réseau (toutes routes) ; 403 et 423 touchent les écritures seulement. */
  const panne = (request: Request, ecriture: boolean): Response | undefined => {
    const entete = request.headers.get('x-panne');
    if (entete === 'reseau') return HttpResponse.error();
    const code = Number(entete ?? options.panne);
    return ecriture && (code === 403 || code === 423) ? erreur(NOMS_PANNE[code], code) : undefined;
  };
  const cle = (request: Request) => EnTeteEcriture.safeParse({ 'idempotency-key': request.headers.get('idempotency-key') ?? undefined });
  const corpsDe = (request: Request) => request.json().catch(() => undefined);

  return [
    http.get(base + '/preferences', async ({ request }) => {
      await attendre();
      const coupure = panne(request, false);
      if (coupure) return coupure;
      const q = new URL(request.url).searchParams;
      const query = QueryPreferences.safeParse(q.has('appareil') ? { appareil: q.get('appareil') } : {});
      if (!query.success || q.getAll('appareil').length > 1) return erreur('BAD_REQUEST', 400);
      return HttpResponse.json(service.lire(query.data.appareil));
    }),

    http.put(base + '/preferences/:cle', async ({ request, params }) => {
      await attendre();
      const coupure = panne(request, true);
      if (coupure) return coupure;
      const entete = cle(request);
      const corps = CorpsPreference.safeParse(await corpsDe(request));
      if (!entete.success || !corps.success) return erreur('BAD_REQUEST', 400);
      try {
        return HttpResponse.json(service.ecrire(String(params['cle']), corps.data, entete.data['idempotency-key']));
      } catch (e) {
        if (e instanceof ErreurPreference) return erreur('BAD_REQUEST', 400);
        throw e;
      }
    }),

    http.post(base + '/usage', async ({ request }) => {
      await attendre();
      const coupure = panne(request, true);
      if (coupure) return coupure;
      const entete = cle(request);
      const corps = CorpsUsage.safeParse(await corpsDe(request));
      if (!entete.success || !corps.success) return erreur('BAD_REQUEST', 400);
      try {
        service.enregistrerUsage(corps.data.evenements, entete.data['idempotency-key']);
      } catch (e) {
        if (e instanceof ErreurUsage) return erreur('BAD_REQUEST', 400);
        throw e;
      }
      return new HttpResponse(null, { status: 204 });
    }),
  ];
}
