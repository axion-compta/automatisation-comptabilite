import { http, HttpResponse, type HttpHandler } from 'msw';
import { CorpsRecherche } from '../../../contrat/src/domaines/recherche.js';
import { creerServiceRecherche } from '../../../contrat/src/domaines/recherche-service.js';

const erreur = (code: string, status: number) => HttpResponse.json({ defined: false, code, status, message: code }, { status });

/** Handler de `POST /recherche`, branché sur le service du contrat. Le corps n'est ni journalisé ni renvoyé. */
export function creerHandlersRecherche(base: string, attendre: () => Promise<void>, options?: unknown): HttpHandler[] {
  void options;
  const service = creerServiceRecherche();
  return [
    http.post(base + '/recherche', async ({ request }) => {
      await attendre();
      const corps = CorpsRecherche.safeParse(await request.json().catch(() => undefined));
      if (!corps.success) return erreur('BAD_REQUEST', 400);
      const r = service.chercher(corps.data);
      if ('erreur' in r) return erreur(r.erreur === 'curseur_invalide' ? 'CURSEUR_INVALIDE' : 'REQUETE_INVALIDE', 400);
      return HttpResponse.json({ body: r });
    }),
  ];
}
