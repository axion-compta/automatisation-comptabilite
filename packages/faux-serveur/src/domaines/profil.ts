import { http, HttpResponse, type HttpHandler } from 'msw';
import { QueryProfil, ReponseProfil } from '../../../contrat/src/domaines/profil.js';
import { creerServiceProfilChamps } from '../../../contrat/src/domaines/profil-champs-service.js';
import { creerHandlersProfilEcriture } from './profil-ecriture.js';
import { ReponseRegimesImposition, ReponseRegimesTva } from '../../../contrat/src/domaines/regimes.js';
import { creerServiceRegimes } from '../../../contrat/src/domaines/regimes-service.js';
import { QueryParametre, ReponseParametre } from '../../../contrat/src/domaines/parametres.js';
import { creerServiceParametres } from '../../../contrat/src/domaines/parametres-service.js';
import { ReponseSiren, ReponseVerificationTva } from '../../../contrat/src/domaines/identite.js';
import { SirenInvalide, creerServiceIdentite } from '../../../contrat/src/domaines/identite-service.js';
import { verifierTvaFrancaise } from '../../../noyau/src/profil/identifiants.js';

const SOCIETE = 'soc-lemoine';
const NUMERO_TVA = /^FR[0-9]{11}$/;
const SIREN = /^[0-9]{9}$/;

const erreur = (code: string, status: number, data?: unknown) =>
  HttpResponse.json({ defined: data !== undefined || status === 422, code, status, message: code, ...(data === undefined ? {} : { data }) }, { status });
const requete400 = () => erreur('BAD_REQUEST', 400);
/** Une clé répétée ou vide n'est jamais acceptée : même 400 que le vrai serveur. */
const query = (url: string) => {
  const q = new URL(url).searchParams;
  return [...q.keys()].length !== new Set(q.keys()).size ? null : Object.fromEntries(q);
};

/** Lectures du profil, des régimes, des paramètres et de l'identité pour Lemoine Rénovation (fictive), construites par les services du contrat. */
export function creerHandlersProfil(base = '', attendre: () => Promise<void> = async () => undefined): HttpHandler[] {
  const champs = creerServiceProfilChamps(SOCIETE);
  const regimes = creerServiceRegimes(SOCIETE);
  const parametres = creerServiceParametres();
  const identite = creerServiceIdentite();
  const aujourdhui = () => new Date().toISOString().slice(0, 10);
  const lecture = (chemin: string, f: (request: Request, params: Record<string, string>) => Response) =>
    http.get(base + chemin, async ({ request, params }) => {
      await attendre();
      return f(request, params as Record<string, string>);
    });

  return [
    lecture('/profil', (request) => {
      const q = query(request.url);
      const p = q === null ? null : QueryProfil.safeParse(q);
      if (!p?.success) return requete400();
      return HttpResponse.json(ReponseProfil.parse({ body: champs.lire(p.data.au, aujourdhui()) }));
    }),
    ...creerHandlersProfilEcriture(base, attendre, champs),
    lecture('/profil/regimes/tva', () => HttpResponse.json(ReponseRegimesTva.parse({ body: regimes.listerTva() }))),
    lecture('/profil/regimes/imposition', () => HttpResponse.json(ReponseRegimesImposition.parse({ body: regimes.listerImposition() }))),
    lecture('/parametres', (request) => {
      const q = query(request.url);
      const p = q === null ? null : QueryParametre.safeParse(q);
      if (!p?.success) return requete400();
      const lu = parametres.lire(p.data.cle, p.data.date);
      if (!lu) return erreur('PARAMETRE_ABSENT', 404, { cle: p.data.cle, date: p.data.date });
      return HttpResponse.json(ReponseParametre.parse({ body: lu }));
    }),
    lecture('/siren/:siren', (_r, { siren }) => {
      if (!SIREN.test(siren ?? '')) return requete400();
      try {
        return HttpResponse.json(ReponseSiren.parse({ body: identite.lireSiren(siren!) }));
      } catch (e) {
        if (e instanceof SirenInvalide) return erreur('SIREN_INVALIDE', 422);
        throw e;
      }
    }),
    lecture('/tva-intracom/:numero/verification', (_r, { numero }) => {
      if (!NUMERO_TVA.test(numero ?? '')) return requete400();
      return HttpResponse.json(ReponseVerificationTva.parse({ body: identite.verifierTva(numero!, verifierTvaFrancaise(numero!).valide) }));
    }),
  ];
}
