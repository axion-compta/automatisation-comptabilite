import Fastify, { type FastifyInstance } from 'fastify';
import { implement, ORPCError } from '@orpc/server';
import { OpenAPIHandler } from '@orpc/openapi/fastify';
import { contrat, contratChat } from '../../../packages/contrat/src/routes.js';
import { ConflitVersion, creerService } from '../../../packages/contrat/src/service.js';
import { routesPlan } from './domaines/plan.js';
import { routesPrincipes } from './domaines/principes.js';
import { routesTiers } from './domaines/tiers.js';
import { routesBanque } from './domaines/banque.js';
import { routesTableauDeBord, type ServiceTableauDeBord } from './domaines/tableau-de-bord.js';
import { routesAlertes, type ServiceAlertes } from './domaines/alertes.js';
import { routesPreferences, type ServicePreferences } from './domaines/preferences.js';
import { routesRecherche, type ServiceRecherche } from './domaines/recherche.js';
import { routesExports, type ServiceExports } from './domaines/exports.js';
import { routesCalendrier, type ServiceCalendrier } from './domaines/calendrier.js';
import { routesTva } from './domaines/tva.js';
import { routesNotifications, type ServiceNotifications } from './domaines/notifications.js';
import { implementerAcces } from './domaines/acces.js';
import { implementerVolume } from './domaines/volume.js';
import { implementerPalier } from './domaines/palier.js';
import { routesProfil } from './domaines/profil.js';
import { routesControles, routesFec } from './domaines/fec.js';
import { routesChange } from './domaines/change.js';
import { routesRegimes } from './domaines/regimes.js';
import { routesParametres } from './domaines/parametres.js';
import { routesFrais } from './domaines/frais.js';
import { routesSante } from './domaines/sante.js';
import { routesJuridique } from './domaines/juridique.js';
import { routesFournisseurs, routesTresorerie } from './domaines/tresorerie.js';
import { creerServiceChat, implementerChat, type ServiceChat } from './domaines/chat.js';
import { creerServicePropositions, implementerChatPropositions, type ServicePropositions } from './domaines/chat-propositions.js';
import type { OptionsAbonnement } from './domaines/options-abonnement.js';
import { brancherSecurite, type OptionsSecurite } from './securite/index.js';

type Service = ReturnType<typeof creerService>;

/** Services en mémoire des domaines du lot 15, créés une fois par `creerRouteur` (vides pour l'instant). */
export type Services = {
  tableauDeBord: ServiceTableauDeBord;
  alertes: ServiceAlertes;
  preferences: ServicePreferences;
  recherche: ServiceRecherche;
  exports: ServiceExports;
  calendrier: ServiceCalendrier;
  notifications: ServiceNotifications;
};

/** Routeur oRPC branché sur le service en mémoire du contrat (pas de base de données). */
export function creerRouteur(service: Service = creerService(), services: Partial<Services> = {}, options: { abonnement?: OptionsAbonnement; chat?: ServiceChat; propositions?: ServicePropositions } = {}) {
  const s: Services = {
    tableauDeBord: services.tableauDeBord ?? {},
    alertes: services.alertes ?? {},
    preferences: services.preferences ?? {},
    recherche: services.recherche ?? {},
    exports: services.exports ?? {},
    calendrier: services.calendrier ?? {},
    notifications: services.notifications ?? {},
  };
  const os = implement(contrat);
  const routeur = os.router({
    ecritures: {
      lister: os.ecritures.lister.handler(({ input }) => {
        return service.page({ limite: input.query?.limite, decalage: input.query?.decalage });
      }),
      creer: os.ecritures.creer.handler(({ input }) => ({
        body: service.creer(input.headers['idempotency-key'], input.body),
      })),
      modifier: os.ecritures.modifier.handler(({ input, errors }) => {
        try {
          return { body: service.modifier(input.headers['idempotency-key'], input.params.id, input.body) };
        } catch (e) {
          if (e instanceof ConflitVersion) throw errors.CONFLIT_VERSION({ data: { versionActuelle: e.versionActuelle } });
          if (e instanceof Error && e.message === 'INTROUVABLE') throw new ORPCError('NOT_FOUND');
          throw e;
        }
      }),
    },
    plan: routesPlan(),
    principes: routesPrincipes(),
    tiers: routesTiers(),
    banque: routesBanque(),
    tableauDeBord: routesTableauDeBord(s.tableauDeBord),
    alertes: routesAlertes(s.alertes),
    preferences: routesPreferences(s.preferences),
    recherche: routesRecherche(s.recherche),
    exports: routesExports(s.exports),
    calendrier: routesCalendrier(s.calendrier),
    tva: routesTva(),
    notifications: routesNotifications(s.notifications),
    profil: routesProfil(),
    fec: routesFec(),
    controles: routesControles(),
    regimes: routesRegimes(),
    change: routesChange(),
    frais: routesFrais(),
    sante: routesSante(),
    juridique: routesJuridique(),
    parametres: routesParametres(),
    tresorerie: routesTresorerie(),
    fournisseurs: routesFournisseurs(),
    abonnement: {
      ...implementerAcces(os, options.abonnement ?? {}),
      ...implementerVolume(os, options.abonnement ?? {}),
      ...implementerPalier(os, options.abonnement ?? {}),
    },
  });
  const osChat = implement(contratChat);
  return { ...routeur, ...osChat.router({ chat: implementerChat(osChat, options.chat ?? creerServiceChat()), chatPropositions: implementerChatPropositions(osChat, options.propositions ?? creerServicePropositions()) }) };
}

/** Serveur Fastify neuf (état en mémoire propre à chaque appel). */
export function creerApp(service?: Service, options: { abonnement?: OptionsAbonnement; chat?: ServiceChat; propositions?: ServicePropositions; securite?: OptionsSecurite } = {}): FastifyInstance {
  const app = Fastify();
  brancherSecurite(app, options.securite ?? {});
  const handler = new OpenAPIHandler(creerRouteur(service, {}, options));
  app.addContentTypeParser('*', (_req, _payload, done) => done(null, undefined));
  app.all('/*', async (request, reply) => {
    const { matched } = await handler.handle(request, reply, { prefix: '/', context: {} });
    if (!matched) reply.status(404).send({ code: 'INTROUVABLE', status: 404 });
  });
  return app;
}
