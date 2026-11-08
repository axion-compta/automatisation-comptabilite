import { delay, http, HttpResponse, type HttpHandler } from 'msw';
import { EnTeteEcriture, ModificationEcriture, NouvelleEcriture } from '../../contrat/src/schemas.js';
import { ConflitVersion, creerService } from '../../contrat/src/service.js';
import { creerHandlersPlan } from './domaines/plan.js';
import { creerHandlersTiers } from './domaines/tiers.js';
import { creerHandlersTableauDeBord } from './domaines/tableau-de-bord.js';
import { creerHandlersAlertes } from './domaines/alertes.js';
import { creerHandlersPreferences } from './domaines/preferences.js';
import { creerHandlersRecherche } from './domaines/recherche.js';
import { creerHandlersExports } from './domaines/exports.js';
import { creerHandlersCalendrier } from './domaines/calendrier.js';
import { creerHandlersNotifications } from './domaines/notifications.js';
import { creerHandlersBanque } from './domaines/banque.js';
import { creerHandlersPrincipes } from './domaines/principes.js';
import { creerHandlersTva } from './domaines/tva.js';
import { creerHandlersChange } from './domaines/change.js';
import { creerHandlersSante } from './domaines/sante.js';
import { creerHandlersJuridique } from './domaines/juridique.js';
import { creerHandlersTresorerie } from './domaines/tresorerie.js';
import { creerHandlersChat, type OptionsChatFaux } from './domaines/chat.js';
import { creerHandlersChatPropositions, type OptionsPropositionsFaux } from './domaines/chat-propositions.js';

/** Format des erreurs : celui du vrai serveur (codes oRPC, `defined` vrai pour les erreurs déclarées au contrat). */
const erreur = (code: string, status: number, data?: unknown) =>
  HttpResponse.json({ defined: data !== undefined, code, status, message: code, ...(data === undefined ? {} : { data }) }, { status });

/** Pannes simulables. Le contrat reste la référence : seul le 409 y est déclaré (sur modifier) ; 423 et 403 sont des pannes de test. */
export type Panne = 403 | 409 | 423;

export type OptionsFauxServeur = {
  /** Latence ajoutée à chaque réponse, en millisecondes (0 par défaut). */
  latenceMs?: number;
  /** Panne appliquée aux routes d'écriture, sauf si l'en-tête x-panne la remplace. */
  panne?: Panne;
  /** Préfixe des routes, vide par défaut. */
  base?: string;
  /** Chat : coupure après N événements, suspension d'un tour (tests). */
  chat?: OptionsChatFaux;
  /** Propositions du chat : acteur, horloge et durées injectés (scénarios « compte de service », « horloge avancée »). */
  propositions?: OptionsPropositionsFaux;
};

const MESSAGES: Record<403 | 423, string> = {
  403: 'FORBIDDEN',
  423: 'RESSOURCE_VERROUILLEE',
};

/** Panne demandée par l'en-tête, sinon par défaut ; limitée aux pannes autorisées pour la route. */
function panneDemandee(entete: string | null, parDefaut: Panne | undefined, autorisees: Panne[]): Panne | undefined {
  const n = Number(entete);
  const p = autorisees.includes(n as Panne) ? (n as Panne) : parDefaut;
  return p !== undefined && autorisees.includes(p) ? p : undefined;
}

/** Fabrique les handlers MSW dérivés du contrat (3 routes), avec un service en mémoire neuf. */
export function creerHandlers(options: OptionsFauxServeur = {}): HttpHandler[] {
  const service = creerService();
  const base = options.base ?? '';
  const attendre = async () => {
    if (options.latenceMs && options.latenceMs > 0) await delay(options.latenceMs);
  };

  const refus = (panne: Panne, versionActuelle = 1) =>
    panne === 409 ? erreur('CONFLIT_VERSION', 409, { versionActuelle }) : erreur(MESSAGES[panne], panne);

  const invalide = () => erreur('BAD_REQUEST', 400);
  const cleDe = (request: Request) =>
    EnTeteEcriture.safeParse({ 'idempotency-key': request.headers.get('idempotency-key') ?? undefined });

  return [
    http.get(base + '/ecritures', async ({ request }) => {
      await attendre();
      const q = new URL(request.url).searchParams;
      const nombre = (nom: string) => (q.get(nom) === null ? undefined : Number(q.get(nom)));
      const limite = nombre('limite');
      const decalage = nombre('decalage');
      if (limite !== undefined && (!Number.isInteger(limite) || limite < 1 || limite > 100)) return invalide();
      if (decalage !== undefined && (!Number.isInteger(decalage) || decalage < 0)) return invalide();
      return HttpResponse.json(service.page({ limite, decalage }));
    }),

    http.post(base + '/ecritures', async ({ request }) => {
      await attendre();
      // Le contrat ne déclare 409 que sur modifier : le POST ne l'accepte pas.
      const panne = panneDemandee(request.headers.get('x-panne'), options.panne, [403, 423]);
      if (panne) return refus(panne);
      const entete = cleDe(request);
      const corps = NouvelleEcriture.safeParse(await request.json().catch(() => undefined));
      if (!entete.success || !corps.success) return invalide();
      return HttpResponse.json({ body: service.creer(entete.data['idempotency-key'], corps.data) });
    }),

    http.put(base + '/ecritures/:id', async ({ request, params }) => {
      await attendre();
      const panne = panneDemandee(request.headers.get('x-panne'), options.panne, [403, 409, 423]);
      if (panne) return refus(panne);
      const entete = cleDe(request);
      const corps = ModificationEcriture.safeParse(await request.json().catch(() => undefined));
      if (!entete.success || !corps.success) return invalide();
      try {
        return HttpResponse.json({ body: service.modifier(entete.data['idempotency-key'], String(params['id']), corps.data) });
      } catch (e) {
        if (e instanceof ConflitVersion) return refus(409, e.versionActuelle);
        return erreur('NOT_FOUND', 404);
      }
    }),

    ...creerHandlersPlan(base, attendre),
    ...creerHandlersTiers(base, attendre),
    ...creerHandlersTableauDeBord(base, attendre, options),
    ...creerHandlersAlertes(base, attendre, options),
    ...creerHandlersPreferences(base, attendre, options),
    ...creerHandlersRecherche(base, attendre, options),
    ...creerHandlersExports(base, attendre, options),
    ...creerHandlersCalendrier(base, attendre, options),
    ...creerHandlersNotifications(base, attendre, options),
    ...creerHandlersChat(base, attendre, options.chat),
    ...creerHandlersChatPropositions(base, attendre, options.propositions),
    ...creerHandlersBanque(base, attendre),
    ...creerHandlersPrincipes(base, attendre),
    ...creerHandlersTva(base, attendre),
    ...creerHandlersChange(base, attendre),
    ...creerHandlersSante(base, attendre),
    ...creerHandlersJuridique(base, attendre),
    ...creerHandlersTresorerie(base, attendre),
  ];
}
