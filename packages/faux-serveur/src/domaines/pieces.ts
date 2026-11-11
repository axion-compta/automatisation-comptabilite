import { http, HttpResponse, type HttpHandler } from 'msw';
import { QueryPieces } from '../../../contrat/src/domaines/pieces.js';
import { detailPiece, listerPiecesService } from '../../../contrat/src/domaines/pieces-service.js';
import type { ContexteFaux } from '../registres/types.js';

/** Pièces en lecture seule : même service que le vrai serveur ; 400 si la query est invalide, 404 si la pièce est inconnue. */
export function handlersPieces(ctx: ContexteFaux): HttpHandler[] {
  return [
    http.get(ctx.base + '/pieces', async ({ request }) => {
      await ctx.attendre();
      const brut = Object.fromEntries(new URL(request.url).searchParams);
      const query = QueryPieces.safeParse(brut);
      if (!query.success) return ctx.erreur('BAD_REQUEST', 400);
      return Response.json(listerPiecesService(query.data));
    }),
    http.get(ctx.base + '/pieces/:id', async ({ params }) => {
      await ctx.attendre();
      const piece = detailPiece(String(params['id']));
      return piece ? Response.json({ body: piece }) : HttpResponse.json({ defined: true, code: 'PIECE_INCONNUE', status: 404, message: 'PIECE_INCONNUE' }, { status: 404 });
    }),
  ];
}
