import { http, HttpResponse, type HttpHandler } from 'msw';
import { creerServicePersonnes, ErreurPersonnes } from '../../../contrat/src/domaines/personnes-service.js';
import { EnTeteEcriture } from '../../../contrat/src/schemas.js';
import { CorpsEnregistrerDemande, CorpsTraiterDemande, RequeteRecherche } from '../../../contrat/src/domaines/personnes.js';
import type { RegleConservation } from '../../../noyau/src/conservation/regles.js';
import { erreurExploitation, type OptionsExploitationFaux } from './options-exploitation.js';

/** Personnes : même service que le serveur, état par `creerHandlers` ; recherche déclarée avant `/demandes/{id}/…`. */
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
  // Comme le vrai serveur : en-tête et corps validés par le contrat, 400 BAD_REQUEST avant tout autre contrôle.
  const entree = async <T>(request: Request, schema: { safeParse: (v: unknown) => { success: boolean; data?: T } }) => {
    const cle = EnTeteEcriture.safeParse({ 'idempotency-key': request.headers.get('idempotency-key') ?? undefined });
    const c = schema.safeParse(await request.json().catch(() => null));
    return cle.success && c.success ? { cle: cle.data['idempotency-key'], corps: c.data as T } : null;
  };
  const refuse = () => erreurExploitation('BAD_REQUEST', 400);

  return [
    http.get(options.base + '/personnes/recherche', ({ request }) => {
      const q = RequeteRecherche.safeParse(Object.fromEntries(new URL(request.url).searchParams));
      return q.success ? repondre(200, (s) => s.rechercher(q.data)) : refuse();
    }),
    http.get(options.base + '/personnes/demandes', () => repondre(200, (s) => s.lister())),
    http.post(options.base + '/personnes/demandes', async ({ request }) => {
      const e = await entree<Parameters<NonNullable<typeof service>['enregistrer']>[1]>(request, CorpsEnregistrerDemande);
      return e === null ? refuse() : repondre(201, (s) => s.enregistrer(e.cle, e.corps));
    }),
    http.post(options.base + '/personnes/demandes/:id/traitement', async ({ request, params }) => {
      const e = await entree<Parameters<NonNullable<typeof service>['traiter']>[2]>(request, CorpsTraiterDemande);
      return e === null ? refuse() : repondre(200, (s) => s.traiter(e.cle, String(params['id']), e.corps));
    }),
  ];
};
