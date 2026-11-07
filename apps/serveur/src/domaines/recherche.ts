export type ServiceRecherche = Record<string, never>; // état en mémoire du domaine « recherche » (vide)
export const routesRecherche = (_service?: ServiceRecherche): Record<string, never> => ({}); // aucune route pour l’instant
