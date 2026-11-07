import Fastify, { type FastifyInstance } from 'fastify';
import { implement, ORPCError } from '@orpc/server';
import { OpenAPIHandler } from '@orpc/openapi/fastify';
import { contrat } from '../../../packages/contrat/src/routes.js';
import { ConflitVersion, creerService } from '../../../packages/contrat/src/service.js';
import { routesPlan } from './domaines/plan.js';
import { routesTiers } from './domaines/tiers.js';
import { routesTableauDeBord, type ServiceTableauDeBord } from './domaines/tableau-de-bord.js';
import { routesAlertes, type ServiceAlertes } from './domaines/alertes.js';
import { routesPreferences, type ServicePreferences } from './domaines/preferences.js';
import { routesRecherche, type ServiceRecherche } from './domaines/recherche.js';
import { routesExports, type ServiceExports } from './domaines/exports.js';
import { routesCalendrier, type ServiceCalendrier } from './domaines/calendrier.js';
import { routesNotifications, type ServiceNotifications } from './domaines/notifications.js';

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
export function creerRouteur(service: Service = creerService(), services: Partial<Services> = {}) {
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
  return os.router({
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
    tiers: routesTiers(),
    tableauDeBord: routesTableauDeBord(s.tableauDeBord),
    alertes: routesAlertes(s.alertes),
    preferences: routesPreferences(s.preferences),
    recherche: routesRecherche(s.recherche),
    exports: routesExports(s.exports),
    calendrier: routesCalendrier(s.calendrier),
    notifications: routesNotifications(s.notifications),
  });
}

/** Serveur Fastify neuf (état en mémoire propre à chaque appel). */
export function creerApp(service?: Service): FastifyInstance {
  const app = Fastify();
  const handler = new OpenAPIHandler(creerRouteur(service));
  app.addContentTypeParser('*', (_req, _payload, done) => done(null, undefined));
  app.all('/*', async (request, reply) => {
    const { matched } = await handler.handle(request, reply, { prefix: '/', context: {} });
    if (!matched) reply.status(404).send({ code: 'INTROUVABLE', status: 404 });
  });
  return app;
}
