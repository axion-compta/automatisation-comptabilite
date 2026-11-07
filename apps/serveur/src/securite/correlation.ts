import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import { rapportOutilErreurs } from '../../../../packages/noyau/src/securite/signalements.js';
import type { OptionsSecurite } from './index.js';

export const nom = 'correlation';

const FORME_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ENTETE = 'x-correlation-id';
const ROUTE_INCONNUE = 'inconnue';

type Rapport = ReturnType<typeof rapportOutilErreurs>;
type OutilErreurs = (rapport: Rapport) => void;

/** Routes modèles du contrat (`/ecritures/{id}`), pour ne jamais rapporter l'adresse réelle. */
function routesModeles(noeud: unknown, trouvees: string[] = []): string[] {
  if (typeof noeud !== 'object' && typeof noeud !== 'function') return trouvees;
  if (noeud === null) return trouvees;
  const chemin = (noeud as { '~orpc'?: { route?: { path?: unknown } } })['~orpc']?.route?.path;
  if (typeof chemin === 'string') trouvees.push(chemin);
  else for (const v of Object.values(noeud)) routesModeles(v, trouvees);
  return trouvees;
}

const MODELES = routesModeles(contrat).map((m) => ({
  m,
  re: new RegExp('^' + m.replace(/\{[^}]+\}/g, '[^/]+') + '$'),
}));

function routeModele(url: string): string {
  const chemin = url.split('?')[0] ?? '';
  return MODELES.find((x) => x.re.test(chemin))?.m ?? ROUTE_INCONNUE;
}

function codeErreur(charge: unknown): string {
  try {
    const c = (JSON.parse(String(charge)) as { code?: unknown }).code;
    return typeof c === 'string' ? c : 'ERREUR';
  } catch {
    return 'ERREUR';
  }
}

export function installer(app: FastifyInstance, options: OptionsSecurite): void {
  const outil = options.outilErreurs;
  const outilErreurs: OutilErreurs | undefined = typeof outil === 'function' ? (outil as OutilErreurs) : undefined;
  if (options.correlation !== true && outilErreurs === undefined) return;

  const codes = new WeakMap<object, string>();
  app.addHook('onRequest', async (request, reply) => {
    const recu = request.headers[ENTETE];
    const code = typeof recu === 'string' && FORME_UUID.test(recu) ? recu : randomUUID();
    codes.set(request, code);
    reply.header(ENTETE, code);
  });
  app.addHook('onSend', async (request, reply, charge) => {
    if (reply.statusCode < 400 || outilErreurs === undefined) return charge;
    try {
      outilErreurs(
        rapportOutilErreurs({ correlation_id: codes.get(request), route: routeModele(request.url), code: codeErreur(charge) }),
      );
    } catch {
      // l'outil d'erreurs ne doit jamais casser la réponse
    }
    return charge;
  });
}
