export type ServiceTableauDeBord = Record<string, never>; // état en mémoire du domaine « tableau de bord » (vide)
export const routesTableauDeBord = (service?: ServiceTableauDeBord): Record<string, never> => (void service, {}); // aucune route pour l’instant
