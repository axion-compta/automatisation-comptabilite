import { http, HttpResponse, type HttpHandler } from 'msw';
import { QueryTableau } from '../../../contrat/src/domaines/tableau-de-bord.js';
import { creerServiceTableauDeBord } from '../../../contrat/src/domaines/tableau-de-bord-service.js';

const erreur = (code: string, status: number) => HttpResponse.json({ defined: status === 404, code, status, message: code }, { status });
const NOMS = ['vue', 'profil'];

/** Query stricte : paramètre répété, clé à crochets ou champ inconnu = 400 ; `undefined` si refusée. */
function lireQuery(url: string) {
  const q = new URL(url).searchParams;
  const cles = [...q.keys()];
  if (cles.some((k) => !NOMS.includes(k)) || NOMS.some((n) => q.getAll(n).length > 1)) return undefined;
  const r = QueryTableau.safeParse(Object.fromEntries(cles.map((k) => [k, q.get(k)])));
  return r.success ? r.data : undefined;
}

/**
 * Handlers des deux routes du tableau de bord, branchés sur le service du contrat (aucun calcul réécrit).
 * `x-panne-bloc: <code>` (faux serveur seul) met ce bloc en panne : 503 sur sa route, état « impossible » dans le tableau.
 */
export function creerHandlersTableauDeBord(base: string, attendre: () => Promise<void>, ...reste: unknown[]): HttpHandler[] {
  void reste;
  const service = creerServiceTableauDeBord();
  const panne = (request: Request) => request.headers.get('x-panne-bloc') ?? undefined;
  const enPanne = <B extends { code: string; etat: string }>(b: B, code: string | undefined): B =>
    b.code === code ? { ...b, etat: 'impossible', mot: 'impossible', donnees: undefined } : b;

  return [
    http.get(base + '/exercices/:exercice/tableau-de-bord', async ({ request, params }) => {
      await attendre();
      const query = lireQuery(request.url);
      if (!query) return erreur('BAD_REQUEST', 400);
      const r = service.lire(String(params['exercice']), query);
      if (!r) return erreur('EXERCICE_INCONNU', 404);
      return HttpResponse.json({ body: { ...r, blocs: r.blocs.map((b) => enPanne(b, panne(request))) } });
    }),

    http.get(base + '/exercices/:exercice/tableau-de-bord/:bloc', async ({ request, params }) => {
      await attendre();
      const query = lireQuery(request.url);
      if (!query) return erreur('BAD_REQUEST', 400);
      const bloc = String(params['bloc']);
      const r = service.lireBloc(String(params['exercice']), bloc, query);
      if (!r) return erreur('EXERCICE_INCONNU', 404);
      if (r === 'bloc_inconnu') return erreur('BLOC_INCONNU', 404);
      if (panne(request) === bloc) return HttpResponse.json({ body: enPanne(r, bloc) });
      return HttpResponse.json({ body: r });
    }),
  ];
}
