// Routes qui agissent vers l'extérieur (e-mail, dépôt, appel d'un tiers, publication).
// Chaque route externe déclare ici son interrupteur ; l'interrupteur doit exister
// dans actions/registre.json et y être fermé par défaut (V3-PRI-013).

/** operationId vers code d'interrupteur. Vide tant qu'aucune route n'agit vers l'extérieur. */
export const ROUTES_EXTERNES: Readonly<Record<string, string>> = {};

/** Fragments (sans accent, minuscules) qui désignent une action vers l'extérieur. */
export const FRAGMENTS_EXTERNES: readonly string[] = [
  'envoyer',
  'email',
  'courriel',
  'publier',
  'notifier',
  'webhook',
  'transmettre',
];
