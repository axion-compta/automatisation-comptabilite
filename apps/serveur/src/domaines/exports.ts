/** Service en mémoire du domaine « exports » : vide, rempli par les fiches suivantes du lot 15. */
export type ServiceExports = Record<string, never>;

/** Routes du domaine « exports » : aucune pour l'instant. */
export function routesExports(service?: ServiceExports): Record<string, never> {
  void service;
  return {};
}
