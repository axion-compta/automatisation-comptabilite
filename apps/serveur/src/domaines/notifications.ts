/** Service en mémoire du domaine « notifications » : vide, rempli par les fiches suivantes du lot 15. */
export type ServiceNotifications = Record<string, never>;

/** Routes du domaine « notifications » : aucune pour l'instant. */
export function routesNotifications(service?: ServiceNotifications): Record<string, never> {
  void service;
  return {};
}
