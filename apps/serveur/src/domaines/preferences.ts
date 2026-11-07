/** Service en mémoire du domaine « preferences » : vide, rempli par les fiches suivantes du lot 15. */
export type ServicePreferences = Record<string, never>;

/** Routes du domaine « preferences » : aucune pour l'instant. */
export function routesPreferences(service?: ServicePreferences): Record<string, never> {
  void service;
  return {};
}
