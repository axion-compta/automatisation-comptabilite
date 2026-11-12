import { http, HttpResponse, type HttpHandler } from 'msw';
import { QueryCalendrier, QueryVocabulaire } from '../../../contrat/src/domaines/calendrier.js';
import { creerServiceCalendrier } from '../../../contrat/src/domaines/calendrier-service.js';
import { ErreurCalendrier } from '../../../noyau/src/alertes/calendrier.js';

const erreur = (code: string, status: number) => HttpResponse.json({ defined: status === 404, code, status, message: code }, { status });

/** Query stricte : clés connues, une seule valeur chacune, sinon `undefined` (le handler répond 400). */
function lireQuery<T>(url: string, noms: readonly string[], schema: { safeParse: (v: unknown) => { success: boolean; data?: T } }): T | undefined {
  const q = new URL(url).searchParams;
  const cles = [...q.keys()];
  if (cles.some((k) => !noms.includes(k)) || noms.some((n) => q.getAll(n).length > 1)) return undefined;
  const r = schema.safeParse(Object.fromEntries(cles.map((k) => [k, q.get(k)])));
  return r.success ? r.data : undefined;
}

/** Handlers du calendrier et du vocabulaire, branchés sur le service du contrat (lecture seule). */
export function creerHandlersCalendrier(base: string, attendre: () => Promise<void>, ...reste: unknown[]): HttpHandler[] {
  void reste;
  const service = creerServiceCalendrier();
  return [
    http.get(base + '/exercices/:exercice/calendrier', async ({ request, params }) => {
      await attendre();
      const q = lireQuery(request.url, Object.keys(QueryCalendrier.shape), QueryCalendrier);
      if (!q) return erreur('BAD_REQUEST', 400);
      try {
        const lignes = service.lire(String(params['exercice']), q.du, q.au);
        return lignes ? HttpResponse.json({ body: lignes }) : erreur('EXERCICE_INCONNU', 404);
      } catch (e) {
        if (e instanceof ErreurCalendrier && e.code === 'ordre_inverse') return erreur('BAD_REQUEST', 400);
        throw e;
      }
    }),
    http.get(base + '/vocabulaire', async ({ request }) => {
      await attendre();
      const q = lireQuery(request.url, Object.keys(QueryVocabulaire.shape), QueryVocabulaire);
      return q ? HttpResponse.json({ body: service.vocabulaire(q.mode) }) : erreur('BAD_REQUEST', 400);
    }),
  ];
}
