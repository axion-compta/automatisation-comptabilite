// Carte des routes à geste humain (V3-PRI-018) : operationId vers code de geste G01 à G12.
// Vide au départ ; la garde réelle des routes n'est pas ici.
export const ROUTES_A_GESTE: Readonly<Record<string, string>> = {};

/** Préfixes d'operationId (minuscules) d'une action sensible : comparer par début, jamais par « contient ». */
export const VERBES_SENSIBLES: readonly string[] = [
  'valider',
  'cloturer',
  'deposer',
  'payer',
  'choisirregime',
  'activer',
  'accepter',
  'proposerdividende',
  'fusionner',
  'envoyer',
  'supprimer',
  'appliquerparametre',
  'ouvririnterrupteur',
  'creercompte',
];
