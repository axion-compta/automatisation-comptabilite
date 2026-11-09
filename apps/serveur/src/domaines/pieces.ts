import { implement, ORPCError } from '@orpc/server';
import { detailPiece, listerPiecesService } from '../../../../packages/contrat/src/domaines/pieces-service.js';
import { contrat } from '../../../../packages/contrat/src/routes.js';

/** Signature sans paramètre, figée par L04-T55. Lecture seule sur le jeu fictif. */
export function routesPieces() {
  const os = implement(contrat.pieces);
  return {
    listerPieces: os.listerPieces.handler(({ input }) => listerPiecesService(input.query ?? {})),
    lirePiece: os.lirePiece.handler(({ input, errors }) => {
      const d = detailPiece(input.params.id);
      if (d === undefined) throw errors.PIECE_INCONNUE();
      return { body: d };
    }),
  };
}
