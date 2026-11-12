import { http, HttpResponse, type HttpHandler } from 'msw';
import { PREFIXE_ROUTES_SOCIETE } from '../../../contrat/src/prefixe-routes.js';
import { lireBaremeIk, listerVehicules } from '../../../contrat/src/domaines/vehicules-bareme.js';
import { creerServiceVehiculesBareme, ErreurBareme } from '../../../contrat/src/domaines/vehicules-bareme-service.js';

const PREFIXE = PREFIXE_ROUTES_SOCIETE.replace('{s}', ':s');
const erreur = (code: string, status: number, defined: boolean) => HttpResponse.json({ defined, code, status, message: code }, { status });

type Schema = { safeParse: (v: unknown) => { success: boolean; data?: { query: Record<string, string> } } };
const schemaDe = (route: { '~orpc': { inputSchema?: unknown } }) => route['~orpc'].inputSchema as Schema;

/** Véhicules et barème au jour J : mêmes routes que le vrai serveur, sur le même service en mémoire. Lecture seule. */
export function creerHandlersVehiculesBareme(base: string, attendre: () => Promise<void>): HttpHandler[] {
  const service = creerServiceVehiculesBareme();
  const queryVehicules = schemaDe(listerVehicules);
  const queryBareme = schemaDe(lireBaremeIk);
  const lire = (schema: Schema, request: Request) => schema.safeParse({ params: { s: 'soc-lemoine' }, query: Object.fromEntries(new URL(request.url).searchParams) });
  const deux = (chemin: string) => [chemin, PREFIXE + chemin];
  return [
    ...deux('/vehicules').map((c) => http.get(base + c, async ({ request }) => {
      await attendre();
      const lu = lire(queryVehicules, request);
      if (!lu.success || !lu.data) return erreur('BAD_REQUEST', 400, false);
      return HttpResponse.json({ body: service.lister(lu.data.query['personne'] as string) });
    })),
    ...deux('/parametres/bareme_ik_voiture').map((c) => http.get(base + c, async ({ request }) => {
      await attendre();
      const lu = lire(queryBareme, request);
      if (!lu.success || !lu.data) return erreur('BAD_REQUEST', 400, false);
      try {
        return HttpResponse.json({ body: service.lire(lu.data.query['date'] as string) });
      } catch (e) {
        if (e instanceof ErreurBareme) return erreur(e.code, e.code === 'BAREME_ABSENT' ? 404 : 409, true);
        throw e;
      }
    })),
  ];
}
