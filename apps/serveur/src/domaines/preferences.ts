export type ServicePreferences = Record<string, never>; // état en mémoire du domaine « preferences » (vide)
export const routesPreferences = (service?: ServicePreferences): Record<string, never> => (void service, {}); // aucune route pour l’instant
