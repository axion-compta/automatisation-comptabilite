import Fastify, { type FastifyInstance } from 'fastify';
import { implement, ORPCError } from '@orpc/server';
import { OpenAPIHandler } from '@orpc/openapi/fastify';
import { contrat, contratChat } from '../../../packages/contrat/src/routes.js';
import { ConflitVersion, creerService } from '../../../packages/contrat/src/service.js';
import { routesPlan } from './domaines/plan.js';
import { routesTiers } from './domaines/tiers.js';
import { implementerAcces } from './domaines/acces.js';
import { implementerVolume } from './domaines/volume.js';
import { implementerPalier } from './domaines/palier.js';
import { creerServiceChat, implementerChat, type ServiceChat } from './domaines/chat.js';
import type { OptionsAbonnement } from './domaines/options-abonnement.js';
import { brancherSecurite, type OptionsSecurite } from './securite/index.js';

type Service = ReturnType<typeof creerService>;
/** Routeur oRPC branché sur le service en mémoire du contrat (pas de base de données). */
export function creerRouteur(service: Service = creerService(), options: { abonnement?: OptionsAbonnement; chat?: ServiceChat } = {}) {
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
    tiers: routesTiers(),
    abonnement: {
      ...implementerAcces(os, options.abonnement ?? {}),
      ...implementerVolume(os, options.abonnement ?? {}),
      ...implementerPalier(os, options.abonnement ?? {}),
    },
  });
  const osChat = implement(contratChat);
  return { ...routeur, ...osChat.router({ chat: implementerChat(osChat, options.chat ?? creerServiceChat()) }) };
}

/** Serveur Fastify neuf (état en mémoire propre à chaque appel). */
export function creerApp(service?: Service, options: { abonnement?: OptionsAbonnement; chat?: ServiceChat; securite?: OptionsSecurite } = {}): FastifyInstance {
  const app = Fastify();
  brancherSecurite(app, options.securite ?? {});
  const handler = new OpenAPIHandler(creerRouteur(service, options));
  app.addContentTypeParser('*', (_req, _payload, done) => done(null, undefined));
  app.all('/*', async (request, reply) => {
    const { matched } = await handler.handle(request, reply, { prefix: '/', context: {} });
    if (!matched) reply.status(404).send({ code: 'INTROUVABLE', status: 404 });
  });
  return app;
}
