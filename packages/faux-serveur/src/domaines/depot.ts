import { http, HttpResponse, type HttpHandler } from 'msw';
import { CANAUX_DEPOT } from '../../../contrat/src/domaines/depot.js';
import { creerDepotEnMemoire } from '../../../contrat/src/domaines/depot-service.js';
import { reglagesPiecesAuJour } from '../../../parametres/src/reglages-pieces.js';
import type { ContexteFaux } from '../registres/types.js';

/** Erreur déclarée au contrat : `defined` vrai, comme sur le vrai serveur. */
const declaree = (code: string, status: number) => HttpResponse.json({ defined: true, code, status, message: code }, { status });

const INDICE_MAX = 9999;

/**
 * Lit les fichiers comme le vrai serveur (notation à crochets) :
 * - `fichiers[0]`, `fichiers[1]`… : indices décimaux sans zéro de tête, chacun une fois, contigus depuis 0, sinon refus (null) ;
 * - `fichiers[]` : ajoutés dans l'ordre d'arrivée, mais refus si mélangés à des indices ;
 * - `fichiers` nu : accepté seulement s'il y a au moins deux parties, ajoutées à la suite ; tout autre nom est ignoré.
 */
function fichiersIndexes(form: FormData | null): File[] | null {
  if (form === null) return [];
  const indexes = new Map<number, File>();
  const sansIndice: File[] = [];
  const nus: File[] = [];
  let doublon = false;
  for (const [nom, v] of form.entries()) {
    if (typeof v === 'string') continue;
    const m = /^fichiers\[(0|[1-9]\d*)?\]$/.exec(nom);
    if (m === null) {
      if (nom === 'fichiers') nus.push(v);
    } else if (m[1] === undefined) sansIndice.push(v);
    else {
      const i = Number(m[1]);
      if (indexes.has(i) || i > INDICE_MAX) doublon = true;
      indexes.set(i, v);
    }
  }
  if (doublon || (indexes.size > 0 && sansIndice.length > 0)) return null;
  const ordre = [...indexes.keys()].sort((a, b) => a - b);
  if (ordre.some((i, rang) => i !== rang)) return null;
  const tous = [...ordre.map((i) => indexes.get(i) as File), ...sansIndice, ...nus];
  if (indexes.size === 0 && sansIndice.length === 0 && nus.length < 2) return [];
  return tous;
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
