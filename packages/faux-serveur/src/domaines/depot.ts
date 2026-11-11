import { http, HttpResponse, type HttpHandler } from 'msw';
import { CANAUX_DEPOT } from '../../../contrat/src/domaines/depot.js';
import { creerDepotEnMemoire } from '../../../contrat/src/domaines/depot-service.js';
import { reglagesPiecesAuJour } from '../../../parametres/src/reglages-pieces.js';
import type { ContexteFaux } from '../registres/types.js';

/** Erreur déclarée au contrat : `defined` vrai, comme sur le vrai serveur. */
const declaree = (code: string, status: number) => HttpResponse.json({ defined: true, code, status, message: code }, { status });

/** Lit les fichiers comme le vrai serveur (oRPC, notation à crochets) ; null = refus. `fichiers[n]` : indices décimaux sans zéro de tête, uniques, contigus depuis 0, au plus 9999 ; `fichiers[]` : ordre d'arrivée, refusé avec des indices ; `fichiers` nu : au moins deux parties. */
function fichiersIndexes(form: FormData | null): File[] | null {
  if (form === null) return [];
  const indexes = new Map<number, File>();
  const sansIndice: File[] = [];
  const nus: File[] = [];
  let doublon = false;
  for (const [nom, v] of form.entries()) {
    const m = /^fichiers\[(0|[1-9]\d*)?\]$/.exec(nom);
    if (typeof v === 'string' || (m === null && nom !== 'fichiers')) continue;
    if (m === null) nus.push(v);
    else if (m[1] === undefined) sansIndice.push(v);
    else {
      doublon ||= indexes.has(Number(m[1])) || Number(m[1]) > 9999;
      indexes.set(Number(m[1]), v);
    }
  }
  const ordre = [...indexes.keys()].sort((a, b) => a - b);
  if (doublon || (indexes.size > 0 && sansIndice.length > 0) || ordre.some((i, rang) => i !== rang)) return null;
  if (indexes.size === 0 && sansIndice.length === 0 && nus.length < 2) return [];
  return [...ordre.map((i) => indexes.get(i) as File), ...sansIndice, ...nus];
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
      if (form === null || fichiers === null || fichiers.length === 0 || typeof canal !== 'string' || !(CANAUX_DEPOT as readonly string[]).includes(canal)) return ctx.erreur('BAD_REQUEST', 400);
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
