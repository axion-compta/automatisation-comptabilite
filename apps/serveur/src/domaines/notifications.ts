export type ServiceNotifications = Record<string, never>; // état en mémoire du domaine « notifications » (vide)
export const routesNotifications = (service?: ServiceNotifications): Record<string, never> => (void service, {}); // aucune route pour l’instant
