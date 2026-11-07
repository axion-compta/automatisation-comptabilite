export type ServiceNotifications = Record<string, never>; // état en mémoire du domaine « notifications » (vide)
export const routesNotifications = (_service?: ServiceNotifications): Record<string, never> => ({}); // aucune route pour l’instant
