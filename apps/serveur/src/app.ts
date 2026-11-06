import Fastify, { type FastifyInstance } from 'fastify';
import { implement, ORPCError } from '@orpc/server';
import { OpenAPIHandler } from '@orpc/openapi/fastify';
import { contrat } from '../../../packages/contrat/src/routes.js';
import { ConflitVersion, creerService } from '../../../packages/contrat/src/service.js';

type Service = ReturnType<typeof creerService>;
/** Routeur oRPC branché sur le service en mémoire du contrat (pas de base de données). */
export function creerRouteur(service: Service = creerService()) {
  const os = implement(contrat);
  return os.router({
    ecritures: {
      lister: os.ecritures.lister.handler(({ input }) => {
        const tout = service.lister();
        const limite = input.query?.limite;
        return { body: limite === undefined ? tout : tout.slice(0, limite) };
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
