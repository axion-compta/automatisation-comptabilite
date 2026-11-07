export type ServiceCalendrier = Record<string, never>; // état en mémoire du domaine « calendrier » (vide)
export const routesCalendrier = (service?: ServiceCalendrier): Record<string, never> => (void service, {}); // aucune route pour l’instant
