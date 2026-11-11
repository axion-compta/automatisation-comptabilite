import { http, HttpResponse, type HttpHandler } from 'msw';
import { lireBaremeIk, listerVehicules } from '../../../contrat/src/domaines/vehicules-bareme.js';
import { creerServiceVehiculesBareme, ErreurBareme } from '../../../contrat/src/domaines/vehicules-bareme-service.js';

const erreur = (code: string, status: number, defined: boolean) => HttpResponse.json({ defined, code, status, message: code }, { status });

type Schema = { safeParse: (v: unknown) => { success: boolean; data?: { query: Record<string, string> } } };
const schemaDe = (route: { '~orpc': { inputSchema?: unknown } }) => route['~orpc'].inputSchema as Schema;

/** Véhicules et barème au jour J : mêmes routes que le vrai serveur, sur le même service en mémoire. Lecture seule. */
export function creerHandlersVehiculesBareme(base: string, attendre: () => Promise<void>): HttpHandler[] {
  const service = creerServiceVehiculesBareme();
  const queryVehicules = schemaDe(listerVehicules);
  const queryBareme = schemaDe(lireBaremeIk);
  const lire = (schema: Schema, request: Request) => schema.safeParse({ query: Object.fromEntries(new URL(request.url).searchParams) });
  return [
    http.get(base + '/vehicules', async ({ request }) => {
      await attendre();
      const lu = lire(queryVehicules, request);
      if (!lu.success || !lu.data) return erreur('BAD_REQUEST', 400, false);
      return HttpResponse.json({ body: service.lister(lu.data.query['personne'] as string) });
    }),
    http.get(base + '/parametres/bareme_ik_voiture', async ({ request }) => {
      await attendre();
      const lu = lire(queryBareme, request);
      if (!lu.success || !lu.data) return erreur('BAD_REQUEST', 400, false);
      try {
        return HttpResponse.json({ body: service.lire(lu.data.query['date'] as string) });
      } catch (e) {
        if (e instanceof ErreurBareme) return erreur(e.code, e.code === 'BAREME_ABSENT' ? 404 : 409, true);
        throw e;
      }
    }),
  ];
}
