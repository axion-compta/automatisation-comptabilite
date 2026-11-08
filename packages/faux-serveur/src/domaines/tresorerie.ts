import { http, HttpResponse, type HttpHandler, type JsonBodyType } from 'msw';
import { contrat } from '../../../contrat/src/routes.js';
import { creerServiceTresorerie } from '../../../contrat/src/domaines/tresorerie-service.js';

const HORIZON_DEFAUT = 30;
const invalide = () => HttpResponse.json({ defined: false, code: 'BAD_REQUEST', status: 400, message: 'BAD_REQUEST' }, { status: 400 });

type Schema = { safeParse: (v: unknown) => { success: boolean; data?: unknown } };
type Query = Record<string, string | number | undefined>;
type Route = { '~orpc': { inputSchema?: unknown } };

/** Valide la requête avec le schéma d'entrée du contrat (jamais redéfini) ; `undefined` si refusée. */
function lire(route: Route, url: string): { query?: Query } | undefined {
  const q = new URL(url).searchParams;
  const r = (route['~orpc'].inputSchema as Schema).safeParse({ query: q.size === 0 ? undefined : Object.fromEntries(q) });
  return r.success ? (r.data as { query?: Query }) : undefined;
}

/** Handlers de trésorerie et de fournisseurs (lecture seule), branchés sur le service en mémoire du contrat. */
export function creerHandlersTresorerie(base: string, attendre: () => Promise<void>): HttpHandler[] {
  const service = creerServiceTresorerie();
  const servir = (chemin: string, route: Route, repondre: (query: Query | undefined) => JsonBodyType) =>
    http.get(base + chemin, async ({ request }) => {
      await attendre();
      const e = lire(route, request.url);
      return e ? HttpResponse.json(repondre(e.query)) : invalide();
    });
  return [
    servir('/tresorerie/prevision', contrat.tresorerie.lirePrevision, (q) =>
      service.prevision((q?.['horizon'] as number | undefined) ?? HORIZON_DEFAUT, (q?.['scenario'] as 'central' | 'prudent' | undefined) ?? 'central'),
    ),
    servir('/tresorerie/flux', contrat.tresorerie.listerFlux, (q) => service.flux(q as { du?: string; au?: string; origine?: string })),
    servir('/fournisseurs/echeances', contrat.fournisseurs.listerEcheancesFournisseurs, (q) => service.echeances(q?.['horizon'] as number | undefined)),
    servir('/fournisseurs/alertes-iban', contrat.fournisseurs.listerAlertesIban, () => service.alertesIban()),
  ];
}
