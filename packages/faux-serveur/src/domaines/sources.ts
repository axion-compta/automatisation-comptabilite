import { http, HttpResponse, type HttpHandler } from 'msw';
import { ReponseEtatSources } from '../../../contrat/src/domaines/sources.js';
import { genererSources } from '../../../donnees-fictives/src/sources.js';

/** État de la veille et des connecteurs : lecture seule, bâti sur genererSources (connecteurs triés par nom, comme le vrai serveur). */
export function creerHandlersSources(base: string, attendre: () => Promise<void>): HttpHandler[] {
  const jeu = genererSources();
  const trier = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  return [
    http.get(base + '/sources/etat', async () => {
      await attendre();
      const corps = ReponseEtatSources.parse({
        body: { veille: { ...jeu.veille }, connecteurs: jeu.connecteurs.map((c) => ({ ...c })).sort((a, b) => trier(a.connecteur, b.connecteur)) },
      });
      return HttpResponse.json(corps);
    }),
    // Lecture seule : toute écriture est refusée, comme sur le vrai serveur (404 : la route n'existe qu'en GET).
    http.post(base + '/sources/etat', () => HttpResponse.json({ defined: false, code: 'NOT_FOUND', status: 404, message: 'NOT_FOUND' }, { status: 404 })),
  ];
}
