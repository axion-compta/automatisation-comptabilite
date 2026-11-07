export type ServiceCalendrier = Record<string, never>; // état en mémoire du domaine « calendrier » (vide)
export const routesCalendrier = (_service?: ServiceCalendrier): Record<string, never> => ({}); // aucune route pour l’instant
