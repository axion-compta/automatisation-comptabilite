import { http, HttpResponse, type HttpHandler } from 'msw';
import { CANAUX_DEPOT } from '../../../contrat/src/domaines/depot.js';
import { creerDepotEnMemoire } from '../../../contrat/src/domaines/depot-service.js';
import { reglagesPiecesAuJour } from '../../../parametres/src/reglages-pieces.js';
import type { ContexteFaux } from '../registres/types.js';

/** Erreur déclarée au contrat : `defined` vrai, comme sur le vrai serveur. */
const declaree = (code: string, status: number) => HttpResponse.json({ defined: true, code, status, message: code }, { status });

/** Parties `fichiers[0]`, `fichiers[1]`… dans l'ordre des indices, comme le vrai serveur (oRPC) ; tout autre nom est ignoré. */
function fichiersIndexes(form: FormData | null): File[] {
  if (form === null) return [];
  const parties: { i: number; f: File }[] = [];
  for (const [nom, v] of form.entries()) {
    const m = /^fichiers\[(\d+)\]$/.exec(nom);
    if (m !== null && typeof v !== 'string') parties.push({ i: Number(m[1]), f: v });
  }
  return parties.sort((a, b) => a.i - b.i).map((p) => p.f);
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
      const canal = form?.get('canal');
      const fichiers = fichiersIndexes(form);
      if (form === null || fichiers.length === 0 || typeof canal !== 'string' || !(CANAUX_DEPOT as readonly string[]).includes(canal)) return ctx.erreur('BAD_REQUEST', 400);
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
