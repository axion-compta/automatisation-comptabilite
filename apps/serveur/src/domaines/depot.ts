import { creerDepotEnMemoire } from '../../../../packages/contrat/src/domaines/depot-service.js';
import type { PieceDeposee } from '../../../../packages/contrat/src/domaines/pieces-service.js';
import { reglagesPiecesAuJour } from '../../../../packages/parametres/src/reglages-pieces.js';
import type { OsContrat } from '../registres/types.js';

/** Dépôt de pièces FICTIVES, état en mémoire propre à chaque routeur. Réglages lus à la date du jour. */
export function implementerDepot(os: OsContrat, pieces: PieceDeposee[] = []) {
  const jour = new Date().toISOString().slice(0, 10);
  const service = creerDepotEnMemoire(pieces, reglagesPiecesAuJour(jour));
  return {
    deposerPieces: os.depot.deposerPieces.handler(async ({ input }) => {
      const octets = await Promise.all(input.body.fichiers.map(async (f) => new Uint8Array(await f.arrayBuffer())));
      return { body: { resultats: await service.deposer(input.headers['idempotency-key'], octets, input.body.canal) } };
    }),
    etatPiece: os.depot.etatPiece.handler(({ input, errors }) => {
      const e = service.etat(input.params.id);
      if (e === undefined) throw errors.PIECE_INCONNUE();
      return { body: e };
    }),
    relancerPiece: os.depot.relancerPiece.handler(({ input, errors }) => {
      const r = service.relancer(input.params.id);
      if (r === 'PIECE_INCONNUE') throw errors.PIECE_INCONNUE();
      if (r === 'RELANCE_IMPOSSIBLE') throw errors.RELANCE_IMPOSSIBLE();
      return { body: r };
    }),
  };
}
