export type ServiceExports = Record<string, never>; // état en mémoire du domaine « exports » (vide)
export const routesExports = (service?: ServiceExports): Record<string, never> => (void service, {}); // aucune route pour l’instant
