import { http, HttpResponse, type HttpHandler } from 'msw';
import { PREFIXE_ROUTES_SOCIETE } from '../../../contrat/src/prefixe-routes.js';
import { listerFrais } from '../../../contrat/src/domaines/frais.js';
import { BornesInvalides, creerServiceFrais } from '../../../contrat/src/domaines/frais-service.js';

const PREFIXE = PREFIXE_ROUTES_SOCIETE.replace('{s}', ':s');
const erreur = (code: string, status: number, defined: boolean) => HttpResponse.json({ defined, code, status, message: code }, { status });

/** Frais en lecture : mêmes routes que le vrai serveur, branchées sur le même service en mémoire. */
export function creerHandlersFrais(base: string, attendre: () => Promise<void>): HttpHandler[] {
  const service = creerServiceFrais();
  const schemaQuery = listerFrais['~orpc'].inputSchema as { safeParse: (v: unknown) => { success: boolean; data?: { query?: Parameters<typeof service.lister>[0] } } };
  /** Chaque route est servie sans préfixe (écrans E17) et sous le préfixe de la société. */
  const deux = (chemin: string) => [chemin, PREFIXE + chemin];
  return [
    ...deux('/frais').map((c) => http.get(base + c, async ({ request }) => {
      await attendre();
      const brut = Object.fromEntries(new URL(request.url).searchParams);
      const lu = schemaQuery.safeParse({ params: { s: 'soc-lemoine' }, query: brut });
      if (!lu.success) return erreur('BAD_REQUEST', 400, false);
      try {
        return HttpResponse.json(service.lister(lu.data?.query));
      } catch (e) {
        if (e instanceof BornesInvalides) return erreur('BORNES_INVALIDES', 400, true);
        throw e;
      }
    })),
    ...deux('/frais/:id').map((c) => http.get(base + c, async ({ params }) => {
      await attendre();
      const f = service.lire(String(params['id']));
      return f ? HttpResponse.json({ body: f }) : erreur('FRAIS_INCONNU', 404, true);
    })),
  ];
}
