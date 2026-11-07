/** Service en mémoire du domaine « calendrier » : vide, rempli par les fiches suivantes du lot 15. */
export type ServiceCalendrier = Record<string, never>;

/** Routes du domaine « calendrier » : aucune pour l'instant. */
export function routesCalendrier(service?: ServiceCalendrier): Record<string, never> {
  void service;
  return {};
}
