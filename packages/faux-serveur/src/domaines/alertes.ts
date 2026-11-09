import { http, HttpResponse, type HttpHandler } from 'msw';
import { QueryAlertes } from '../../../contrat/src/domaines/alertes.js';
import { creerServiceAlertes } from '../../../contrat/src/domaines/alertes-service.js';

const erreur = (code: string, status: number) => HttpResponse.json({ defined: status === 404, code, status, message: code }, { status });
const NOMS = ['etat', 'entree', 'limite', 'decalage'];

/** Query stricte : champ inconnu ou paramètre répété = 400 ; `undefined` si refusée. */
function lireQuery(url: string) {
  const q = new URL(url).searchParams;
  const cles = [...q.keys()];
  if (cles.some((k) => !NOMS.includes(k)) || NOMS.some((n) => q.getAll(n).length > 1)) return undefined;
  const r = QueryAlertes.safeParse(Object.fromEntries(cles.map((k) => [k, q.get(k)])));
  return r.success ? r.data : undefined;
}

/** Handlers des alertes (liste) et des compteurs : même service en mémoire que le vrai serveur, un service neuf par fabrique. */
export function creerHandlersAlertes(base: string, attendre: () => Promise<void>, ...reste: unknown[]): HttpHandler[] {
  void reste;
  const service = creerServiceAlertes();
  return [
    http.get(base + '/exercices/:exercice/alertes', async ({ request, params }) => {
      await attendre();
      if (!service.exerciceConnu(String(params['exercice']))) return erreur('EXERCICE_INCONNU', 404);
      const query = lireQuery(request.url);
      return query ? HttpResponse.json(service.lister(query)) : erreur('BAD_REQUEST', 400);
    }),
    http.get(base + '/exercices/:exercice/compteurs', async ({ params }) => {
      await attendre();
      return service.exerciceConnu(String(params['exercice'])) ? HttpResponse.json(service.compteurs()) : erreur('EXERCICE_INCONNU', 404);
    }),
  ];
}
