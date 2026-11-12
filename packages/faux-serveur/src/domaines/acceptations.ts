import { http, HttpResponse, type HttpHandler } from 'msw';
import { creerServiceAcceptations } from '../../../contrat/src/domaines/acceptations-service.js';
import { CleIdempotence } from '../../../contrat/src/schemas.js';
import { erreurAbonnement, scenarioDeLaRequete, type OptionsAbonnementFaux } from './options-abonnement.js';

const STATUT_CREE = 201;
const STATUTS = { VERSION_PERIMEE: 409, DOCUMENT_ABSENT: 404 } as const;
const STATUT_ERREUR = 500;
const corpsValide = (c: unknown): c is { type: string; version: number } => {
  const o = c as { type?: unknown; version?: unknown } | null;
  return typeof o?.type === 'string' && o.type !== '' && Number.isSafeInteger(o.version) && (o.version as number) >= 1;
};

/** Acceptations : même service que le vrai serveur ; un état par scénario, gardé par instance de handlers. */
export const handlersAcceptations = (options: OptionsAbonnementFaux): HttpHandler[] => {
  const services = new Map<string, ReturnType<typeof creerServiceAcceptations>>();
  const serviceDe = (request: Request) => {
    const scenario = scenarioDeLaRequete(request, options);
    if (!services.has(scenario ?? '')) services.set(scenario ?? '', creerServiceAcceptations({ horloge: options.horloge, scenario }));
    return services.get(scenario ?? '')!;
  };
  return [
    http.get(options.base + '/documents-contractuels/a-accepter', async ({ request }) => {
      await options.attendre();
      return HttpResponse.json({ body: serviceDe(request).aAccepter() });
    }),
    http.post(options.base + '/acceptations', async ({ request }) => {
      await options.attendre();
      const cle = CleIdempotence.safeParse(request.headers.get('idempotency-key'));
      const corps = await request.json().catch(() => undefined);
      if (!cle.success || !corpsValide(corps)) return erreurAbonnement('BAD_REQUEST', 400);
      try {
        const r = serviceDe(request).accepter(cle.data, corps);
        return r.ok ? HttpResponse.json(r.valeur, { status: STATUT_CREE }) : erreurAbonnement(r.erreur, STATUTS[r.erreur], {});
      } catch {
        return erreurAbonnement('INTERNAL_SERVER_ERROR', STATUT_ERREUR);
      }
    }),
  ];
};
