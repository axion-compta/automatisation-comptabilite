import { http, HttpResponse, type HttpHandler } from 'msw';
import { deposerPieces } from '../../../contrat/src/domaines/depot.js';
import { creerDepotEnMemoire } from '../../../contrat/src/domaines/depot-service.js';
import { reglagesPiecesAuJour } from '../../../parametres/src/reglages-pieces.js';
import type { ContexteFaux } from '../registres/types.js';

/** Erreur déclarée au contrat : `defined` vrai, comme sur le vrai serveur. */
const declaree = (code: string, status: number) => HttpResponse.json({ defined: true, code, status, message: code }, { status });

/** Reproduit, pour la clé `fichiers`, la notation à crochets d'oRPC (openapi-client, StandardBracketNotationSerializer) : `fichiers[n]` indice décimal sans zéro de tête (la borne 9999 d'oRPC est sans effet : au plus 20 fichiers contigus) ; `fichiers[]` ajoute en fin et ne se mêle pas aux indices ; `fichiers` nu s'ajoute au tableau existant ou, seul avant des crochets, est remplacé par eux. Toute partie `fichiers[...]` qui n'est ni un indice valide ni `[]` (imbriquée, ou clé texte) rend le corps invalide (null) ; un nom non terminé (`fichiers[`, `fichiers[0]x`) est une autre clé, ignorée. */
function fichiersOrpc(form: FormData): unknown {
  let val: unknown;
  let pousse = false;
  for (const [nom, v] of form.entries()) {
    const m = /^fichiers\[(.*)\]$/.exec(nom);
    if (nom !== 'fichiers' && m === null) continue;
    const seg = m?.[1];
    if (seg === undefined) val = val === undefined ? v : Array.isArray(val) ? [...val, v] : [val, v];
    else {
      const t: unknown[] = Array.isArray(val) ? val : [];
      const valide = /^(0|[1-9]\d*)$/.test(seg);
      if (seg === '' ? t.length > 0 && !pousse : pousse || !valide || seg in t) return null;
      pousse ||= seg === '';
      if (seg === '') t.push(v);
      else t[Number(seg)] = v;
      val = t;
    }
  }
  return Array.isArray(val) ? Array.from(val) : val;
}

/** Dépôt de pièces FICTIVES : même service que le vrai serveur, état en mémoire propre à chaque série de handlers. */
export function handlersDepot(ctx: ContexteFaux): HttpHandler[] {
  const service = creerDepotEnMemoire([], reglagesPiecesAuJour(new Date().toISOString().slice(0, 10)));
  const sansCle = (request: Request) => (request.headers.get('idempotency-key') ?? '') === '';
  return [
    http.post(ctx.base + '/pieces', async ({ request }) => {
      await ctx.attendre();
      if (sansCle(request)) return ctx.erreur('BAD_REQUEST', 400);
      const form = await request.formData().catch(() => null);
      const lu = form === null ? undefined : deposerPieces['~orpc'].inputSchema?.shape.body.safeParse({ fichiers: fichiersOrpc(form), canal: form.get('canal') });
      if (!lu?.success) return ctx.erreur('BAD_REQUEST', 400);
      const { fichiers, canal } = lu.data;
      const octets = await Promise.all(fichiers.map(async (f) => new Uint8Array(await f.arrayBuffer())));
      const cle = request.headers.get('idempotency-key') ?? '';
      return Response.json({ body: { resultats: await service.deposer(cle, octets, canal) } });
    }),
    http.get(ctx.base + '/pieces/:id/etat', async ({ params }) => {
      await ctx.attendre();
      const e = service.etat(String(params['id']));
      return e === undefined ? declaree('PIECE_INCONNUE', 404) : Response.json({ body: e });
    }),
    http.post(ctx.base + '/pieces/:id/relancer', async ({ request, params }) => {
      await ctx.attendre();
      if (sansCle(request)) return ctx.erreur('BAD_REQUEST', 400);
      const r = service.relancer(String(params['id']));
      if (r === 'PIECE_INCONNUE') return declaree('PIECE_INCONNUE', 404);
      if (r === 'RELANCE_IMPOSSIBLE') return declaree('RELANCE_IMPOSSIBLE', 409);
      return Response.json({ body: r });
    }),
  ];
}
