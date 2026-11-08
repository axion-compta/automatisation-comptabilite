import { http, HttpResponse, type HttpHandler } from 'msw';
import { contrat } from '../../../contrat/src/routes.js';
import { creerServiceTva } from '../../../contrat/src/domaines/tva-service.js';

const erreur = (code: string, status: number) => HttpResponse.json({ defined: status === 404, code, status, message: code }, { status });
const invalide = () => erreur('BAD_REQUEST', 400);

type Schema = { safeParse: (v: unknown) => { success: boolean; data?: unknown } };
const entree = (route: { '~orpc': { inputSchema?: unknown } }): Schema => route['~orpc'].inputSchema as Schema;

/** Valide avec le schéma d'entrée du contrat (jamais redéfini). */
function lire<T>(route: { '~orpc': { inputSchema?: unknown } }, valeur: unknown): T | undefined {
  const r = entree(route).safeParse(valeur);
  return r.success ? (r.data as T) : undefined;
}

/** Handlers de la TVA en lecture seule, branchés sur le service du contrat. */
export function creerHandlersTva(base: string, attendre: () => Promise<void>): HttpHandler[] {
  const service = creerServiceTva();
  return [
    http.get(base + '/exercices/:exercice/tva/periodes', async ({ request, params }) => {
      await attendre();
      const q = new URL(request.url).searchParams;
      const query = q.size === 0 ? undefined : Object.fromEntries(q);
      const e = lire<{ params: { exercice: string }; query?: { limite?: number; decalage?: number } }>(contrat.tva.listerPeriodesTva, {
        params: { exercice: String(params['exercice']) },
        query,
      });
      if (!e) return invalide();
      const r = service.periodes(e.params.exercice, e.query);
      return r ? HttpResponse.json(r) : erreur('EXERCICE_INCONNU', 404);
    }),
    http.get(base + '/exercices/:exercice/tva/estimation', async ({ params }) => {
      await attendre();
      const e = lire<{ params: { exercice: string } }>(contrat.tva.lireEstimationTva, { params: { exercice: String(params['exercice']) } });
      if (!e) return invalide();
      const r = service.estimation(e.params.exercice);
      return r ? HttpResponse.json({ body: r }) : erreur('EXERCICE_INCONNU', 404);
    }),
    http.get(new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/exercices//tva/(estimation|periodes)$`), async () => {
      await attendre();
      return invalide();
    }),
    http.get(base + '/tva/declarations/', async () => {
      await attendre();
      return erreur('NOT_FOUND', 404);
    }),
    http.get(base + '/tva/declarations/:declaration', async ({ params }) => {
      await attendre();
      const e = lire<{ params: { declaration: string } }>(contrat.tva.lireDeclarationTva, { params: { declaration: String(params['declaration']) } });
      if (!e) return invalide();
      const r = service.declaration(e.params.declaration);
      return r ? HttpResponse.json({ body: r }) : erreur('DECLARATION_INCONNUE', 404);
    }),
  ];
}
