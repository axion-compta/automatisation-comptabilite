/** Service en mémoire du domaine « alertes » : vide, rempli par les fiches suivantes du lot 15. */
export type ServiceAlertes = Record<string, never>;

/** Routes du domaine « alertes » : aucune pour l'instant. */
export function routesAlertes(service?: ServiceAlertes): Record<string, never> {
  void service;
  return {};
}
