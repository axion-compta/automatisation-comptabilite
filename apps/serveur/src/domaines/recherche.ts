/** Service en mémoire du domaine « recherche » : vide, rempli par les fiches suivantes du lot 15. */
export type ServiceRecherche = Record<string, never>;

/** Routes du domaine « recherche » : aucune pour l'instant. */
export function routesRecherche(service?: ServiceRecherche): Record<string, never> {
  void service;
  return {};
}
