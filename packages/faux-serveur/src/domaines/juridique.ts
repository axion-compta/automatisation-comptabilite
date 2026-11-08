import { http, HttpResponse, type HttpHandler } from 'msw';
import { ParamsJuridique, ReponseObligationsJuridiques } from '../../../contrat/src/domaines/juridique.js';
import { creerServiceJuridique } from '../../../contrat/src/domaines/juridique-service.js';

/** SIREN fictif de la SARL du jeu : même société par défaut que le vrai serveur. */
export const SIREN_PAR_DEFAUT = '123456782';

const erreur = (code: string, status: number, defined = false) => HttpResponse.json({ defined, code, status, message: code }, { status });

/** Handler de `GET /exercices/{exercice}/juridique`, branché sur le service du contrat. Toute autre méthode : 404 comme le vrai serveur. */
export function creerHandlersJuridique(base: string, attendre: () => Promise<void>, siren: string = SIREN_PAR_DEFAUT): HttpHandler[] {
  const service = creerServiceJuridique(siren);
  const chemin = base + '/exercices/:exercice/juridique';
  return [
    http.get(chemin, async ({ params }) => {
      await attendre();
      const p = ParamsJuridique.safeParse({ exercice: String(params['exercice']) });
      if (!p.success) return erreur('BAD_REQUEST', 400);
      const o = service.lire(p.data.exercice);
      if (!o) return erreur('EXERCICE_INCONNU', 404, true);
      return HttpResponse.json(ReponseObligationsJuridiques.parse({ body: o }));
    }),
    http.all(chemin, async () => {
      await attendre();
      return HttpResponse.json({ code: 'INTROUVABLE', status: 404 }, { status: 404 });
    }),
  ];
}
