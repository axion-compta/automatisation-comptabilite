// Carte des routes à geste humain (V3-PRI-018) : operationId vers code de geste G01 à G12.
// Vide au départ ; la garde réelle des routes n'est pas ici.
export const ROUTES_A_GESTE: Readonly<Record<string, string>> = {
  // Valider un lot de frais valide les écritures proposées par proposerFrais (permission compta-valider).
  validerFrais: 'G01',
  // Valider un rapport juridique : clôture, double facteur récent toujours exigé (code à confirmer par Will).
  validerRapport: 'G02',
};

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
