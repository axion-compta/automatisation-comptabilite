/** Service en mémoire du domaine « tableau-de-bord » : vide, rempli par les fiches suivantes du lot 15. */
export type ServiceTableauDeBord = Record<string, never>;

/** Routes du domaine « tableau-de-bord » : aucune pour l'instant. */
export function routesTableauDeBord(service?: ServiceTableauDeBord): Record<string, never> {
  void service;
  return {};
}
