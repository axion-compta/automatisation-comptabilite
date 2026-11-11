import { http, HttpResponse, type HttpHandler } from 'msw';
import { creerServiceFinContrat, type ErreurFinContrat, type ResultatFinContrat } from '../../../contrat/src/domaines/fin-contrat-service.js';
import { CleIdempotence } from '../../../contrat/src/schemas.js';
import { MotifGel } from '../../../contrat/src/domaines/fin-contrat.js';
import { erreurAbonnement, scenarioDeLaRequete, type OptionsAbonnementFaux } from './options-abonnement.js';

const STATUTS: Record<ErreurFinContrat, number> = {
  PAS_DE_REMISE: 409, DEJA_ACCUSE: 409, EMPREINTE_DIFFERENTE: 422, GEL_DEJA_ACTIF: 409, GEL_INACTIF: 409, BAD_REQUEST: 400, INTERNAL_SERVER_ERROR: 500,
};
const EMPREINTE = /^[0-9a-f]{64}$/;
const reponse = (r: ResultatFinContrat) =>
  r.ok ? HttpResponse.json(r.valeur) : erreurAbonnement(r.erreur, STATUTS[r.erreur], STATUTS[r.erreur] === 409 || STATUTS[r.erreur] === 422 ? {} : undefined);

/** Fin de contrat et gel : même service que le vrai serveur ; un état par scénario, gardé par instance de handlers. */
export const handlersFinContrat = (options: OptionsAbonnementFaux): HttpHandler[] => {
  const services = new Map<string, ReturnType<typeof creerServiceFinContrat>>();
  const serviceDe = (request: Request) => {
    const scenario = scenarioDeLaRequete(request, options);
    if (!services.has(scenario ?? '')) services.set(scenario ?? '', creerServiceFinContrat({ horloge: options.horloge, scenario }));
    return services.get(scenario ?? '')!;
  };
  const ecriture = (chemin: string, valide: (c: unknown) => boolean, appliquer: (s: ReturnType<typeof creerServiceFinContrat>, cle: string, c: never) => ResultatFinContrat) =>
    http.post(options.base + chemin, async ({ request }) => {
      await options.attendre();
      const cle = CleIdempotence.safeParse(request.headers.get('idempotency-key'));
      const corps = await request.json().catch(() => undefined);
      if (!cle.success || !valide(corps)) return erreurAbonnement('BAD_REQUEST', STATUTS.BAD_REQUEST);
      try {
        return reponse(appliquer(serviceDe(request), cle.data, corps as never));
      } catch {
        return erreurAbonnement('INTERNAL_SERVER_ERROR', STATUTS.INTERNAL_SERVER_ERROR);
      }
    });
  const motifValide = (c: unknown) => MotifGel.safeParse(c).success;
  return [
    http.get(options.base + '/fin-contrat', async ({ request }) => {
      await options.attendre();
      return HttpResponse.json(serviceDe(request).lire());
    }),
    ecriture('/fin-contrat/accuse', (c) => EMPREINTE.test((c as { manifeste_empreinte?: string } | null)?.manifeste_empreinte ?? ''), (s, cle, c: { manifeste_empreinte: string }) => s.accuser(cle, c)),
    ecriture('/fin-contrat/gel/levee', motifValide, (s, cle, c: { motif: string }) => s.leverGel(cle, c)),
    ecriture('/fin-contrat/gel', motifValide, (s, cle, c: { motif: string }) => s.poserGel(cle, c)),
  ];
};
