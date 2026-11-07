import { http, HttpResponse, type HttpHandler } from 'msw';
import { z } from 'zod';
import { creerServiceTiers } from '../../../contrat/src/domaines/tiers-service.js';

/** Mêmes bornes que la query du contrat (`listerTiers`) ; le filtrage, lui, reste dans le service du contrat. Copie locale, comme pour le plan. */
const QueryTiers = z.object({
  type: z.enum(['client', 'fournisseur']).optional(),
  q: z.string().max(50).optional(),
  limite: z.coerce.number().int().min(1).max(100).optional(),
  decalage: z.coerce.number().int().min(0).optional(),
});

const erreur = (code: string, status: number) => HttpResponse.json({ defined: false, code, status, message: code }, { status });

/** Handler de `GET /tiers`, branché sur le service du contrat. */
export function creerHandlersTiers(base: string, attendre: () => Promise<void>): HttpHandler[] {
  const service = creerServiceTiers();
  return [
    http.get(base + '/tiers', async ({ request }) => {
      await attendre();
      const q = new URL(request.url).searchParams;
      const noms = ['type', 'q', 'limite', 'decalage'];
      const textes = ['type', 'q'];
      // Clé à crochets sur type ou q : 400, comme le vrai serveur. Pour limite[] et decalage[], le vrai serveur l'accepte (écart connu, non testé).
      if ([...q.keys()].some((k) => textes.some((n) => k.startsWith(n + '[')))) return erreur('BAD_REQUEST', 400);
      // Paramètre répété : 400 (q.get() ne garderait que la première valeur).
      if (noms.some((n) => q.getAll(n).length > 1)) return erreur('BAD_REQUEST', 400);
      const brut = Object.fromEntries(noms.flatMap((n) => (q.has(n) ? [[n, q.get(n)]] : [])));
      const query = QueryTiers.safeParse(brut);
      if (!query.success) return erreur('BAD_REQUEST', 400);
      return HttpResponse.json(service.lister(query.data));
    }),
  ];
}
