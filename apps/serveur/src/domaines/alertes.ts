export type ServiceAlertes = Record<string, never>; // état en mémoire du domaine « alertes » (vide)
export const routesAlertes = (_service?: ServiceAlertes): Record<string, never> => ({}); // aucune route pour l’instant
