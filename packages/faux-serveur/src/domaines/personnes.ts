import { http, HttpResponse, type HttpHandler } from 'msw';
import type * as Module from '../../../contrat/src/domaines/personnes-service.js';
import { EnTeteEcriture } from '../../../contrat/src/schemas.js';
import { CorpsEnregistrerDemande, CorpsTraiterDemande, RequeteRecherche } from '../../../contrat/src/domaines/personnes.js';
import type { RegleConservation } from '../../../noyau/src/conservation/regles.js';
import { erreurExploitation, type OptionsExploitationFaux } from './options-exploitation.js';

/** Personnes : même service que le serveur, état par `creerHandlers` ; recherche déclarée avant `/demandes/{id}/…`. */
export const handlersPersonnes = (options: OptionsExploitationFaux): HttpHandler[] => {
  const reglages = options.reglagesPersonnes;
  type Service = ReturnType<typeof Module.creerServicePersonnes>;
  let cache: Promise<{ m: typeof Module; s: Service }> | undefined; // chargé à la 1re requête : import statique = node:crypto évalué au démarrage du navigateur
  const charger = (r: NonNullable<typeof reglages>) => (cache ??= import('../../../contrat/src/domaines/personnes-service.js').then((m) => ({ m, s: m.creerServicePersonnes({
    horloge: options.horloge, dateReference: options.dateReference, moisReponse: r.moisReponse, joursRappel: r.joursRappel,
    regles: (options.reglesConservation ?? []) as readonly RegleConservation[],
  }) })));
  const repondre = async (statutSucces: number, f: (s: Service) => unknown) => {
    await options.attendre();
    if (reglages === undefined) return erreurExploitation('REGLAGE_ABSENT', 503);
    const { m, s } = await charger(reglages);
    try {
      return HttpResponse.json({ body: f(s) }, { status: statutSucces });
    } catch (e) {
      if (e instanceof m.ErreurPersonnes) return erreurExploitation(e.code, e.status);
      throw e;
    }
  };
  const entree = async <T>(request: Request, schema: { safeParse: (v: unknown) => { success: boolean; data?: unknown } }) => {
    const [cle, c] = [EnTeteEcriture.safeParse({ 'idempotency-key': request.headers.get('idempotency-key') ?? undefined }), schema.safeParse(await request.json().catch(() => null))];
    return cle.success && c.success ? { cle: cle.data['idempotency-key'], corps: c.data as T } : null;
  };
  const refuse = () => erreurExploitation('BAD_REQUEST', 400); // comme le vrai serveur : contrat validé avant tout autre contrôle
  return [
    http.get(options.base + '/personnes/recherche', ({ request }) => {
      const q = RequeteRecherche.safeParse(Object.fromEntries(new URL(request.url).searchParams));
      return q.success ? repondre(200, (s) => s.rechercher(q.data as Parameters<Service['rechercher']>[0])) : refuse();
    }),
    http.get(options.base + '/personnes/demandes', () => repondre(200, (s) => s.lister())),
    http.post(options.base + '/personnes/demandes', async ({ request }) => {
      const e = await entree<Parameters<Service['enregistrer']>[1]>(request, CorpsEnregistrerDemande);
      return e === null ? refuse() : repondre(201, (s) => s.enregistrer(e.cle, e.corps));
    }),
    http.post(options.base + '/personnes/demandes/:id/traitement', async ({ request, params }) => {
      const e = await entree<Parameters<Service['traiter']>[2]>(request, CorpsTraiterDemande);
      return e === null ? refuse() : repondre(200, (s) => s.traiter(e.cle, String(params['id']), e.corps));
    }),
  ];
};
