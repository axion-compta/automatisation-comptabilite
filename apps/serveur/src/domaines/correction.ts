import { creerCorrectionEnMemoire } from '../../../../packages/contrat/src/domaines/correction-service.js';
import type { PieceDetail } from '../../../../packages/contrat/src/domaines/pieces.js';
import { reglagesPiecesAuJour } from '../../../../packages/parametres/src/reglages-pieces.js';
import type { OsContrat } from '../registres/types.js';

/** Correction d'un champ lu sur des pièces FICTIVES, état en mémoire propre à chaque routeur. */
export function implementerCorrection(os: OsContrat, stock: Map<string, PieceDetail> = new Map()) {
  const service = creerCorrectionEnMemoire(stock, reglagesPiecesAuJour(new Date().toISOString().slice(0, 10)).nomLongueurMax);
  return {
    corrigerChamp: os.correction.corrigerChamp.handler(({ input, errors }) => {
      const r = service.corriger(input.params.id, input.params.nom, input.body.valeur, input.body.pourquoi);
      if (r === 'PIECE_INCONNUE') throw errors.PIECE_INCONNUE();
      if (r === 'CHAMP_INCONNU') throw errors.CHAMP_INCONNU();
      if (r === 'VALEUR_ILLISIBLE') throw errors.VALEUR_ILLISIBLE();
      if (r === 'PIECE_SENSIBLE') throw errors.PIECE_SENSIBLE();
      return { body: r };
    }),
  };
}
