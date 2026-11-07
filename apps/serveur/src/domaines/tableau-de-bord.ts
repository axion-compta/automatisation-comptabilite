export type ServiceTableauDeBord = Record<string, never>; // état en mémoire du domaine « tableau de bord » (vide)
export const routesTableauDeBord = (_service?: ServiceTableauDeBord): Record<string, never> => ({}); // aucune route pour l’instant
