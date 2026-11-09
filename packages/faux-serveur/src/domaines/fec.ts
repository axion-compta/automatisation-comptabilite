import { http, HttpResponse, type HttpHandler } from 'msw';
import { contrat } from '../../../contrat/src/routes.js';
import { creerServiceFec } from '../../../contrat/src/domaines/fec-service.js';
import { creerServiceControles } from '../../../contrat/src/domaines/controles-service.js';

const erreur = (code: string, status: number) => HttpResponse.json({ defined: status === 404, code, status, message: code }, { status });
const invalide = () => erreur('BAD_REQUEST', 400);

type Route = { '~orpc': { inputSchema?: unknown } };
type Schema = { safeParse: (v: unknown) => { success: boolean; data?: unknown } };

/** Valide avec le schéma d'entrée du contrat (jamais redéfini). */
function lire<T>(route: Route, valeur: unknown): T | undefined {
  const r = (route['~orpc'].inputSchema as Schema).safeParse(valeur);
  return r.success ? (r.data as T) : undefined;
}

/** Handlers du FEC et des contrôles tracés (lecture seule), branchés sur les services du contrat. */
export function creerHandlersFec(base: string, attendre: () => Promise<void>): HttpHandler[] {
  const fec = creerServiceFec();
  const controles = creerServiceControles();
  const vide = (chemin: string) => http.get(base + chemin, async () => (await attendre(), invalide()));
  return [
    http.get(base + '/exercices/:exercice/fec/historique', async ({ params }) => {
      await attendre();
      const e = lire<{ params: { exercice: string } }>(contrat.fec.listerHistoriqueFec, { params: { exercice: String(params['exercice']) } });
      if (!e) return invalide();
      const r = fec.historique(e.params.exercice);
      return r ? HttpResponse.json({ body: r }) : erreur('EXERCICE_INCONNU', 404);
    }),
    http.get(base + '/fec/:fec', async ({ params }) => {
      await attendre();
      const e = lire<{ params: { fec: string } }>(contrat.fec.lireFec, { params: { fec: String(params['fec']) } });
      if (!e) return invalide();
      const r = fec.lire(e.params.fec);
      return r ? HttpResponse.json({ body: r }) : erreur('FEC_INCONNU', 404);
    }),
    http.get(base + '/fec/', async () => (await attendre(), erreur('NOT_FOUND', 404))),
    vide('/exercices//fec/historique'),
    vide('/exercices//controles'),
    http.get(base + '/exercices/:exercice/controles', async ({ request, params }) => {
      await attendre();
      const q = new URL(request.url).searchParams;
      type Entree = { params: { exercice: string }; query?: { resultat?: never; limite?: number; decalage?: number } };
      const e = lire<Entree>(contrat.controles.listerTraces, { params: { exercice: String(params['exercice']) }, query: q.size === 0 ? undefined : Object.fromEntries(q) });
      if (!e) return invalide();
      const r = controles.lister(e.params.exercice, e.query);
      return r ? HttpResponse.json(r) : erreur('EXERCICE_INCONNU', 404);
    }),
  ];
}
