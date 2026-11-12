import { routeAutorisee, type DemandeRoute, type RouteIA } from './routes-ia.js';

export interface EtatModeleDefaut {
  readonly route: DemandeRoute;
  /** Vrai tant que la route demandée n'est pas déclarée dans la liste fermée. */
  readonly provisoire: boolean;
}

/** Étiquette « provisoire » du modèle par défaut ; ne déclare ni n'autorise aucune route (voir routeAutorisee). */
export function etatModeleDefaut(routes: readonly RouteIA[], demande: DemandeRoute): EtatModeleDefaut {
  return { route: demande, provisoire: !routeAutorisee(routes, demande).autorisee };
}
