import { http, HttpResponse, type HttpHandler } from 'msw';
import { CorpsCorrection } from '../../../contrat/src/domaines/correction.js';
import { creerCorrectionEnMemoire } from '../../../contrat/src/domaines/correction-service.js';
import type { PieceDetail } from '../../../contrat/src/domaines/pieces.js';
import { reglagesPiecesAuJour } from '../../../parametres/src/reglages-pieces.js';
import type { ContexteFaux } from '../registres/types.js';

/** Erreur déclarée au contrat : `defined` vrai, comme sur le vrai serveur. */
const declaree = (code: string, status: number) => HttpResponse.json({ defined: true, code, status, message: code }, { status });
const STATUTS: Record<string, number> = { PIECE_INCONNUE: 404, CHAMP_INCONNU: 404, PIECE_SENSIBLE: 409 };

/** Correction d'un champ lu sur des pièces FICTIVES : même service que le vrai serveur, état en mémoire propre à chaque série de handlers. */
export function handlersCorrection(ctx: ContexteFaux): HttpHandler[] {
  const stock = new Map<string, PieceDetail>();
  const service = creerCorrectionEnMemoire(stock, reglagesPiecesAuJour(new Date().toISOString().slice(0, 10)).nomLongueurMax);
  return [
    http.patch(ctx.base + '/pieces/:id/champs/:nom', async ({ request, params }) => {
      await ctx.attendre();
      if ((request.headers.get('idempotency-key') ?? '') === '') return ctx.erreur('BAD_REQUEST', 400);
      const corps = CorpsCorrection.safeParse(await request.json().catch(() => null));
      if (!corps.success) return ctx.erreur('BAD_REQUEST', 400);
      const r = service.corriger(String(params['id']), String(params['nom']), corps.data.valeur, corps.data.pourquoi);
      // Comme sur le vrai serveur, une valeur illisible sort en 400 générique (le code 400 du contrat est celui de la validation).
      if (r === 'VALEUR_ILLISIBLE') return ctx.erreur('BAD_REQUEST', 400);
      return typeof r === 'string' ? declaree(r, STATUTS[r] ?? 409) : Response.json({ body: r });
    }),
  ];
}
