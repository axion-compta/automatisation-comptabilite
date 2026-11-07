export type ServiceExports = Record<string, never>; // état en mémoire du domaine « exports » (vide)
export const routesExports = (_service?: ServiceExports): Record<string, never> => ({}); // aucune route pour l’instant
