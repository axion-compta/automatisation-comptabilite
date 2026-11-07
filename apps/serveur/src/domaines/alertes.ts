export type ServiceAlertes = Record<string, never>; // état en mémoire du domaine « alertes » (vide)
export const routesAlertes = (service?: ServiceAlertes): Record<string, never> => (void service, {}); // aucune route pour l’instant
