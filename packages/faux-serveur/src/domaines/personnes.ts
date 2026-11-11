import { http, HttpResponse, type HttpHandler } from 'msw';
import { creerServicePersonnes, ErreurPersonnes } from '../../../contrat/src/domaines/personnes-service.js';
import type { RegleConservation } from '../../../noyau/src/conservation/regles.js';
import { erreurExploitation, type OptionsExploitationFaux } from './options-exploitation.js';

/**
 * Personnes : même service que le serveur en mémoire, état gardé par appel de `handlersPersonnes` (donc par `creerHandlers`).
 * La recherche est déclarée avant les routes `/personnes/demandes/{id}/…`.
 */
export const handlersPersonnes = (options: OptionsExploitationFaux): HttpHandler[] => {
  const reglages = options.reglagesPersonnes;
  const service = reglages === undefined ? null : creerServicePersonnes({
    horloge: options.horloge,
    dateReference: options.dateReference,
    moisReponse: reglages.moisReponse,
    joursRappel: reglages.joursRappel,
    regles: (options.reglesConservation ?? []) as readonly RegleConservation[],
  });
  const repondre = async (statutSucces: number, f: (s: NonNullable<typeof service>) => unknown) => {
    await options.attendre();
    if (service === null) return erreurExploitation('REGLAGE_ABSENT', 503);
    try {
      return HttpResponse.json({ body: f(service) }, { status: statutSucces });
    } catch (e) {
      if (e instanceof ErreurPersonnes) return erreurExploitation(e.code, e.status);
      throw e;
    }
  };
  const cleDe = (request: Request): string => request.headers.get('idempotency-key') ?? '';

  return [
    http.get(options.base + '/personnes/recherche', ({ request }) => {
      const q = new URL(request.url).searchParams;
      const critere: { nom?: string; email?: string; iban?: string } = {};
      for (const k of ['nom', 'email', 'iban'] as const) {
        const v = q.get(k);
        if (v !== null) critere[k] = v;
      }
      return repondre(200, (s) => s.rechercher(critere));
    }),
    http.get(options.base + '/personnes/demandes', () => repondre(200, (s) => s.lister())),
    http.post(options.base + '/personnes/demandes', async ({ request }) => {
      const corps = (await request.json()) as Parameters<NonNullable<typeof service>['enregistrer']>[1];
      return repondre(201, (s) => s.enregistrer(cleDe(request), corps));
    }),
    http.post(options.base + '/personnes/demandes/:id/traitement', async ({ request, params }) => {
      const corps = (await request.json()) as Parameters<NonNullable<typeof service>['traiter']>[2];
      return repondre(200, (s) => s.traiter(cleDe(request), String(params['id']), corps));
    }),
  ];
};
