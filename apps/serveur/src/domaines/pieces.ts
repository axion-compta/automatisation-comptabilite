import { implement, ORPCError } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';

/** Bouchon : le contrat est figé, le service réel viendra avec L04-T30. Signature sans paramètre, figée. */
export function routesPieces() {
  const os = implement(contrat.pieces);
  return {
    listerPieces: os.listerPieces.handler(() => {
      throw new ORPCError('NOT_IMPLEMENTED');
    }),
    lirePiece: os.lirePiece.handler(() => {
      throw new ORPCError('NOT_IMPLEMENTED');
    }),
  };
}
