export type ServicePreferences = Record<string, never>; // état en mémoire du domaine « preferences » (vide)
export const routesPreferences = (_service?: ServicePreferences): Record<string, never> => ({}); // aucune route pour l’instant
