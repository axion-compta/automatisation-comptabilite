export type ServiceRecherche = Record<string, never>; // état en mémoire du domaine « recherche » (vide)
export const routesRecherche = (service?: ServiceRecherche): Record<string, never> => (void service, {}); // aucune route pour l’instant
