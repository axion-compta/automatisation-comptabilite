import { http, HttpResponse, type HttpHandler } from 'msw';
import { creerServicePalier, type ErreurPalier } from '../../../contrat/src/domaines/palier-service.js';
import { CleIdempotence } from '../../../contrat/src/schemas.js';
import { erreurAbonnement, scenarioDeLaRequete, type OptionsAbonnementFaux } from './options-abonnement.js';

const STATUT_CREE = 201;
const STATUT_ERREUR = 500;
const STATUTS: Record<ErreurPalier, number> = { ACCORD_MANQUANT: 422, PALIER_INCONNU: 404, PALIER_IDENTIQUE: 422, PALIER_NON_SUPERIEUR: 422 };
const corpsValide = (c: unknown): c is { code_demande: string; accord: boolean } => {
  const o = c as { code_demande?: unknown; accord?: unknown } | null;
  return typeof o?.code_demande === 'string' && o.code_demande !== '' && typeof o.accord === 'boolean';
};

/** Demande de palier : même service que le vrai serveur ; un état par scénario, gardé par instance de handlers. */
export const handlersPalier = (options: OptionsAbonnementFaux): HttpHandler[] => {
  const services = new Map<string, ReturnType<typeof creerServicePalier>>();
  const serviceDe = (scenario: string | null) => {
    if (!services.has(scenario ?? '')) services.set(scenario ?? '', creerServicePalier({ horloge: options.horloge, scenario }));
    return services.get(scenario ?? '')!;
  };
  return [
    http.post(options.base + '/abonnement/demandes-palier', async ({ request }) => {
      await options.attendre();
      const cle = CleIdempotence.safeParse(request.headers.get('idempotency-key'));
      const corps = await request.json().catch(() => undefined);
      if (!cle.success || !corpsValide(corps)) return erreurAbonnement('BAD_REQUEST', 400);
      try {
        const r = serviceDe(scenarioDeLaRequete(request, options)).demander(cle.data, corps);
        return r.ok ? HttpResponse.json(r.valeur, { status: STATUT_CREE }) : erreurAbonnement(r.erreur, STATUTS[r.erreur], {});
      } catch {
        return erreurAbonnement('INTERNAL_SERVER_ERROR', STATUT_ERREUR);
      }
    }),
  ];
};
