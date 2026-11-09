import { HttpResponse, type HttpHandler, http } from 'msw';

/** Options communes aux domaines de l'abonnement du faux serveur (contrat entre fiches L07-T16 à L07-T21). */
export type OptionsAbonnementFaux = {
  base: string;
  horloge: () => string;
  scenarioParDefaut: string | null;
  attendre: () => Promise<void>;
};

const STATUT_NON_IMPLEMENTE = 501;

/** Format des erreurs : celui du vrai serveur (codes oRPC, `defined` vrai pour les erreurs déclarées au contrat). */
export const erreurAbonnement = (code: string, status: number, data?: unknown) =>
  HttpResponse.json({ defined: data !== undefined, code, status, message: code, ...(data === undefined ? {} : { data }) }, { status });

/** Scénario simulé : l'en-tête `x-scenario-abonnement` l'emporte, sinon l'option, sinon null. */
export function scenarioDeLaRequete(request: Request, options: Pick<OptionsAbonnementFaux, 'scenarioParDefaut'>): string | null {
  return request.headers.get('x-scenario-abonnement') ?? options.scenarioParDefaut;
}

type Route = readonly ['get' | 'post', string];

/** Handlers 501 NOT_IMPLEMENTED pour les routes données (chemins exacts du contrat, préfixés par `base`). */
export function handlersNonImplementes(options: OptionsAbonnementFaux, routes: readonly Route[]): HttpHandler[] {
  return routes.map(([methode, chemin]) =>
    http[methode](options.base + chemin, async () => {
      await options.attendre();
      return erreurAbonnement('NOT_IMPLEMENTED', STATUT_NON_IMPLEMENTE);
    }),
  );
}
