import { delay, http, HttpResponse, type HttpHandler } from 'msw';
import {
  ConflitVersion,
  creerService,
  EnTeteEcriture,
  ModificationEcriture,
  NouvelleEcriture,
} from '../../contrat/src/index.js';

/** Pannes simulables. Le contrat reste la référence : seul le 409 y est déclaré, 423 et 403 sont des pannes de test. */
export type Panne = 403 | 409 | 423;

export type OptionsFauxServeur = {
  /** Latence ajoutée à chaque réponse, en millisecondes (0 par défaut). */
  latenceMs?: number;
  /** Panne appliquée à toutes les routes d'écriture, sauf si l'en-tête x-panne la remplace. */
  panne?: Panne;
  /** Préfixe des routes, vide par défaut. */
  base?: string;
};

const MESSAGES: Record<403 | 423, string> = {
  403: 'ACCES_REFUSE',
  423: 'RESSOURCE_VERROUILLEE',
};

function panneDemandee(entete: string | null, parDefaut?: Panne): Panne | undefined {
  const n = Number(entete);
  if (n === 403 || n === 409 || n === 423) return n;
  return parDefaut;
}

/** Fabrique les handlers MSW dérivés du contrat (3 routes), avec un service en mémoire neuf. */
export function creerHandlers(options: OptionsFauxServeur = {}): HttpHandler[] {
  const service = creerService();
  const base = options.base ?? '';
  const attendre = async () => {
    if (options.latenceMs && options.latenceMs > 0) await delay(options.latenceMs);
  };

  const refus = (panne: Panne, versionActuelle = 1) =>
    panne === 409
      ? HttpResponse.json({ code: 'CONFLIT_VERSION', status: 409, data: { versionActuelle } }, { status: 409 })
      : HttpResponse.json({ code: MESSAGES[panne], status: panne }, { status: panne });

  const invalide = () => HttpResponse.json({ code: 'REQUETE_INVALIDE', status: 400 }, { status: 400 });
  const cleDe = (request: Request) =>
    EnTeteEcriture.safeParse({ 'idempotency-key': request.headers.get('idempotency-key') ?? undefined });

  return [
    http.get(base + '/ecritures', async ({ request }) => {
      await attendre();
      const url = new URL(request.url);
      const limiteBrute = url.searchParams.get('limite');
      const limite = limiteBrute === null ? undefined : Number(limiteBrute);
      if (limite !== undefined && (!Number.isInteger(limite) || limite < 1 || limite > 100)) return invalide();
      const decalage = Math.max(0, Number(url.searchParams.get('decalage') ?? 0) || 0);
      const tout = service.lister();
      const page = tout.slice(decalage, limite === undefined ? undefined : decalage + limite);
      const suivant = decalage + page.length;
      return HttpResponse.json(page, {
        headers: {
          'x-total': String(tout.length),
          ...(suivant < tout.length ? { 'x-decalage-suivant': String(suivant) } : {}),
        },
      });
    }),

    http.post(base + '/ecritures', async ({ request }) => {
      await attendre();
      const panne = panneDemandee(request.headers.get('x-panne'), options.panne);
      if (panne) return refus(panne);
      const entete = cleDe(request);
      const corps = NouvelleEcriture.safeParse(await request.json().catch(() => undefined));
      if (!entete.success || !corps.success) return invalide();
      return HttpResponse.json(service.creer(entete.data['idempotency-key'], corps.data));
    }),

    http.put(base + '/ecritures/:id', async ({ request, params }) => {
      await attendre();
      const panne = panneDemandee(request.headers.get('x-panne'), options.panne);
      if (panne) return refus(panne);
      const entete = cleDe(request);
      const corps = ModificationEcriture.safeParse(await request.json().catch(() => undefined));
      if (!entete.success || !corps.success) return invalide();
      try {
        return HttpResponse.json(service.modifier(entete.data['idempotency-key'], String(params['id']), corps.data));
      } catch (e) {
        if (e instanceof ConflitVersion) return refus(409, e.versionActuelle);
        return HttpResponse.json({ code: 'INTROUVABLE', status: 404 }, { status: 404 });
      }
    }),
  ];
}
